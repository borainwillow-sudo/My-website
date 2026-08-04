(function () {
  var DRAFT_KEY = "wb_draft";
  var AUTH_KEY = "wb_auth";
  var EDITING_KEY = "wb_editing";

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
    return raw ? JSON.parse(raw) : null;
  }

  function saveDraft(data) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }

  async function getData() {
    var draft = loadDraft();
    if (draft) return draft;
    return await loadPublished();
  }

  async function resetToDefaults() {
    localStorage.removeItem(DRAFT_KEY);
    return await loadPublished();
  }

  function downloadJSON(filename, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json",
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportData(data) {
    downloadJSON("data.json", data);
  }

  function publishSite(data) {
    downloadJSON("data.json", data);
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

  function resizeImage(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var width = img.width;
          var height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          var canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  window.WB = window.WB || {};
  Object.assign(window.WB, {
    getData: getData,
    saveDraft: saveDraft,
    resetToDefaults: resetToDefaults,
    exportData: exportData,
    publishSite: publishSite,
    setPassword: setPassword,
    verifyPassword: verifyPassword,
    getAuth: getAuth,
    isEditing: isEditing,
    setEditing: setEditing,
    resizeImage: resizeImage,
  });
})();
