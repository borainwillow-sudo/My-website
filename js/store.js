(function () {
  var DRAFT_KEY = "wb_draft";
  var AUTH_KEY = "wb_auth";
  var EDITING_KEY = "wb_editing";
  var PENDING_KEY = "wb_pending_photos";

  // Photos that have been processed in the browser but not yet committed.
  // Held as Blobs in IndexedDB (not localStorage, which is far too small and
  // string-only) so that staged work survives a reload or a crash.
  var pendingPhotos = {};
  var DB_NAME = "wb_photos";
  var STORE = "pending";
  var dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var store = t.objectStore(STORE);
        var out = fn(store);
        t.oncomplete = function () {
          resolve(out && out.result !== undefined ? out.result : out);
        };
        t.onerror = function () {
          reject(t.error);
        };
      });
    });
  }

  async function idbPut(record) {
    return tx("readwrite", function (s) {
      return s.put(record);
    });
  }

  async function idbGetAll() {
    return tx("readonly", function (s) {
      return s.getAll();
    });
  }

  async function idbClear() {
    return tx("readwrite", function (s) {
      return s.clear();
    });
  }

  // Rehydrates anything staged in a previous session so its images still
  // render (and can still be published) after a reload.
  async function initPending() {
    try {
      var records = await idbGetAll();
      (records || []).forEach(function (r) {
        pendingPhotos[r.id] = r;
      });
      return Object.keys(pendingPhotos).length;
    } catch (e) {
      return 0;
    }
  }

  async function loadPublished() {
    try {
      var res = await fetch("data.json", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      return await res.json();
    } catch (e) {
      return JSON.parse(JSON.stringify(window.WB.DEFAULT_DATA));
    }
  }

  function loadDraft() {
    var raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveDraft(data) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  async function getData() {
    return loadDraft() || (await loadPublished());
  }

  async function addPendingPhoto(processed) {
    pendingPhotos[processed.id] = processed;
    try {
      await idbPut({
        id: processed.id,
        width: processed.width,
        height: processed.height,
        displayPath: processed.displayPath,
        thumbPath: processed.thumbPath,
        displayBlob: processed.displayBlob,
        thumbBlob: processed.thumbBlob,
      });
    } catch (e) {
      // Staying in memory still works for this session; publishing is the
      // durable step either way.
      console.warn("Could not stage photo to IndexedDB:", e);
    }
  }

  function getPendingPhotos() {
    return Object.keys(pendingPhotos).map(function (k) {
      return pendingPhotos[k];
    });
  }

  async function clearPendingPhotos() {
    Object.keys(pendingPhotos).forEach(function (k) {
      var p = pendingPhotos[k];
      if (p.objectUrl) URL.revokeObjectURL(p.objectUrl);
      if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
    });
    pendingPhotos = {};
    try {
      await idbClear();
    } catch (e) {}
  }

  function pendingCount() {
    return Object.keys(pendingPhotos).length;
  }

  function pendingPhotoUrl(path) {
    var found = null;
    Object.keys(pendingPhotos).forEach(function (k) {
      var p = pendingPhotos[k];
      if (p.displayPath === path || p.thumbPath === path) {
        if (!p.objectUrl) p.objectUrl = URL.createObjectURL(p.displayBlob);
        if (!p.thumbUrl) p.thumbUrl = URL.createObjectURL(p.thumbBlob);
        found = p.displayPath === path ? p.objectUrl : p.thumbUrl;
      }
    });
    return found;
  }

  // Resolves a stored path to something the browser can render right now:
  // an in-memory blob for not-yet-committed photos, otherwise the real file.
  function resolveSrc(path) {
    if (!path) return null;
    return pendingPhotoUrl(path) || path;
  }

  function downloadJSON(filename, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function hashPw(pw) {
    var enc = new TextEncoder().encode(pw);
    var buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map(function (b) {
        return b.toString(16).padStart(2, "0");
      })
      .join("");
  }

  function getAuth() {
    var raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  async function setPassword(pw) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ hash: await hashPw(pw) }));
  }

  async function verifyPassword(pw) {
    var auth = getAuth();
    if (!auth) return false;
    return (await hashPw(pw)) === auth.hash;
  }

  function isEditing() {
    return localStorage.getItem(EDITING_KEY) === "true";
  }

  function setEditing(v) {
    localStorage.setItem(EDITING_KEY, v ? "true" : "false");
  }

  window.WB = window.WB || {};
  Object.assign(window.WB, {
    getData: getData,
    loadPublished: loadPublished,
    saveDraft: saveDraft,
    clearDraft: clearDraft,
    downloadJSON: downloadJSON,
    setPassword: setPassword,
    verifyPassword: verifyPassword,
    getAuth: getAuth,
    isEditing: isEditing,
    setEditing: setEditing,
    addPendingPhoto: addPendingPhoto,
    getPendingPhotos: getPendingPhotos,
    clearPendingPhotos: clearPendingPhotos,
    pendingCount: pendingCount,
    initPending: initPending,
    resolveSrc: resolveSrc,
  });
})();
