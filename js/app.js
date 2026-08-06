(function () {
  var data = null;
  var currentId = "home";
  var openGroups = {};
  var saveTimer = null;
  var saving = false;
  var dirtySinceCommit = false;

  var $ = function (id) {
    return document.getElementById(id);
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- data helpers ----------

  function allPages(d) {
    var out = [];
    (d.pages || []).forEach(function (p) {
      out.push(p);
      (p.children || []).forEach(function (c) {
        out.push(c);
      });
    });
    return out;
  }

  function findPage(d, id) {
    return allPages(d).find(function (p) {
      return p.id === id;
    });
  }

  function parentGroupOf(d, id) {
    return (d.pages || []).find(function (p) {
      return (p.children || []).some(function (c) {
        return c.id === id;
      });
    });
  }

  function firstNavigablePage(d) {
    var p = allPages(d).find(function (x) {
      return x.type !== "group";
    });
    return p ? p.id : "home";
  }

  function uniquePageId(d, base) {
    var ids = allPages(d).map(function (p) {
      return p.id;
    });
    var slug = window.WB.slugify(base) || "page";
    var candidate = slug;
    var n = 1;
    while (ids.indexOf(candidate) !== -1) {
      n++;
      candidate = slug + "-" + n;
    }
    return candidate;
  }

  // ---------- typography ----------

  function applyTypography() {
    var t = data.typography || {};
    window.WB.TYPO_ROLES.forEach(function (role) {
      var cfg = t[role.key];
      if (!cfg) return;
      document.documentElement.style.setProperty(
        "--f-" + role.key + "-weight",
        cfg.weight
      );
      document.documentElement.style.setProperty(
        "--f-" + role.key + "-size",
        cfg.size + "px"
      );
    });
  }

  // ---------- saving ----------

  function setStatus(text, cls) {
    var el = $("save-status");
    el.textContent = text;
    el.className = "save-status" + (cls ? " " + cls : "");
  }

  function markDirty() {
    var ok = window.WB.saveDraft(data);
    dirtySinceCommit = true;
    if (!ok) {
      setStatus("Local draft too large — save now to publish", "is-error");
    }
    if (!window.WB.gh.hasToken()) {
      setStatus("Saved on this device — connect GitHub to publish", "");
      return;
    }
    setStatus("Unsaved changes", "");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(commit, 2500);
  }

  async function commit(opts) {
    opts = opts || {};
    if (saving) return;
    if (!window.WB.gh.hasToken()) {
      if (opts.manual) openConnect();
      return;
    }
    if (!dirtySinceCommit && !opts.manual) return;

    saving = true;
    clearTimeout(saveTimer);
    var pending = window.WB.getPendingPhotos();
    setStatus(
      pending.length ? "Saving " + pending.length + " photo(s)…" : "Saving…",
      "is-saving"
    );

    try {
      var files = [
        {
          path: "data.json",
          content: JSON.stringify(data, null, 2),
          encoding: "utf-8",
        },
      ];
      for (var i = 0; i < pending.length; i++) {
        var p = pending[i];
        files.push({
          path: p.displayPath,
          content: await window.WB.blobToBase64(p.displayBlob),
          encoding: "base64",
        });
        files.push({
          path: p.thumbPath,
          content: await window.WB.blobToBase64(p.thumbBlob),
          encoding: "base64",
        });
      }

      await window.WB.gh.commitFiles(files, "Update site content");
      await window.WB.clearPendingPhotos();
      dirtySinceCommit = false;
      setStatus("Saved — live in about a minute", "is-saved");
    } catch (err) {
      setStatus(String(err.message || err), "is-error");
    } finally {
      saving = false;
    }
  }

  // ---------- nav ----------

  function renderNav() {
    var nav = $("nav-content");
    var html = "";
    (data.pages || []).forEach(function (page) {
      if (page.type === "group") {
        var isOpen = !!openGroups[page.id];
        html +=
          '<button class="nav-item nav-group-toggle" data-group="' +
          esc(page.id) +
          '" aria-expanded="' +
          isOpen +
          '"><span>' +
          esc(page.title) +
          "</span><span>" +
          (isOpen ? "&minus;" : "+") +
          "</span></button>";
        html += '<div class="nav-children' + (isOpen ? " open" : "") + '">';
        (page.children || []).forEach(function (child) {
          html +=
            '<a class="nav-item nav-child' +
            (child.id === currentId ? " is-active" : "") +
            '" href="#/' +
            esc(child.id) +
            '">' +
            esc(child.title) +
            "</a>";
        });
        html += "</div>";
      } else {
        html +=
          '<a class="nav-item' +
          (page.id === currentId ? " is-active" : "") +
          '" href="#/' +
          esc(page.id) +
          '">' +
          esc(page.title) +
          "</a>";
      }
    });
    nav.innerHTML = html;
  }

  // ---------- page rendering ----------

  function headerHTML(page) {
    var editing = window.WB.isEditing();
    var h = page.header || {};
    var attr = function (field) {
      return editing
        ? ' contenteditable="true" data-header-field="' + field + '"'
        : "";
    };
    var hasAny =
      h.title || h.meta || h.quote || h.description || editing;
    if (!hasAny) return "";

    var row = "";
    if (h.title || editing)
      row += '<div class="header-title"' + attr("title") + ">" + esc(h.title) + "</div>";
    if (h.meta || editing)
      row += '<div class="header-meta"' + attr("meta") + ">" + esc(h.meta) + "</div>";
    if (h.quote || editing)
      row += '<div class="header-quote"' + attr("quote") + ">" + esc(h.quote) + "</div>";

    var desc =
      h.description || editing
        ? '<div class="header-description"' +
          attr("description") +
          ">" +
          esc(h.description) +
          "</div>"
        : "";

    return (
      '<div class="page-header">' +
      (row ? '<div class="header-row">' + row + "</div>" : "") +
      desc +
      "</div>"
    );
  }

  function photoHTML(photo) {
    var editing = window.WB.isEditing();
    var thumb = window.WB.resolveSrc(photo.thumb);
    var tools = editing
      ? '<div class="photo-tools">' +
        '<button data-photo-action="replace">Replace</button>' +
        '<button data-photo-action="crop">Crop</button>' +
        '<button data-photo-action="front">Front</button>' +
        '<button data-photo-action="remove" class="danger">Remove</button>' +
        "</div>"
      : "";
    var handle = editing ? '<div class="resize-handle"></div>' : "";
    var caption =
      photo.caption || editing
        ? '<div class="photo-caption"' +
          (editing ? ' contenteditable="true" data-caption-for="' + esc(photo.id) + '"' : "") +
          ">" +
          esc(photo.caption || "") +
          "</div>"
        : "";

    return (
      '<div class="photo-block" data-photo-id="' +
      esc(photo.id) +
      '">' +
      tools +
      '<img src="' +
      esc(thumb) +
      '" alt="' +
      esc(photo.caption || "") +
      '" width="' +
      (photo.width || "") +
      '" height="' +
      (photo.height || "") +
      '" loading="lazy" decoding="async">' +
      caption +
      handle +
      "</div>"
    );
  }

  function renderPage() {
    var page = findPage(data, currentId);
    var main = $("main");

    if (!page || page.type === "group") {
      main.innerHTML = '<p class="empty-note">Page not found.</p>';
      return;
    }

    if (page.type === "text") {
      var editing = window.WB.isEditing();
      main.innerHTML =
        headerHTML(page) +
        '<div class="text-body"' +
        (editing ? ' contenteditable="true" data-body-field="1"' : "") +
        ">" +
        esc(page.body || "") +
        "</div>";
      return;
    }

    var photos = page.photos || [];
    var canvasInner = photos.map(photoHTML).join("");
    main.innerHTML =
      headerHTML(page) +
      '<div class="canvas" id="canvas">' +
      canvasInner +
      '<div class="snap-overlay"></div>' +
      "</div>" +
      (photos.length === 0
        ? '<p class="empty-note">' +
          (window.WB.isEditing()
            ? "No photos yet — use “Add photos” below."
            : "Nothing here yet.") +
          "</p>"
        : "");

    var canvas = $("canvas");
    if (!canvas) return;
    window.WB.layout.applyPositions(canvas, photos);
    if (window.WB.isEditing() && window.innerWidth > 820) {
      window.WB.layout.enableEditing(canvas, photos, function () {
        markDirty();
      });
    }
  }

  function render() {
    applyTypography();
    $("site-name").textContent = data.siteName;
    $("mobile-name").textContent = data.siteName;
    document.title = data.siteName;
    var group = parentGroupOf(data, currentId);
    if (group) openGroups[group.id] = true;
    renderNav();
    renderPage();
    updateEditUI();
  }

  // ---------- routing ----------

  function routeFromHash() {
    var hash = location.hash.replace(/^#\/?/, "");
    return hash || firstNavigablePage(data);
  }

  function onHashChange() {
    var id = routeFromHash();
    var page = findPage(data, id);
    currentId = page && page.type !== "group" ? id : firstNavigablePage(data);
    closeNav();
    render();
    window.scrollTo(0, 0);
  }

  // ---------- edit UI ----------

  function updateEditUI() {
    var editing = window.WB.isEditing();
    $("edit-bar").hidden = !editing;
    $("edit-site-btn").hidden = editing;
    document.body.classList.toggle("is-editing", editing);
  }

  function openModal(html) {
    var root = $("modal-root");
    root.innerHTML = '<div class="modal-overlay"><div class="modal">' + html + "</div></div>";
    var overlay = root.querySelector(".modal-overlay");
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) root.innerHTML = "";
    });
    return root.querySelector(".modal");
  }

  function closeModal() {
    $("modal-root").innerHTML = "";
  }

  // ---------- connect (GitHub token) ----------

  function openConnect() {
    var repo = window.WB.gh.detectRepo();
    var repoLabel = repo ? repo.owner + "/" + repo.repo : "not detected";
    var modal = openModal(
      "<h3>Connect GitHub</h3>" +
        '<p class="hint">Paste a fine-grained personal access token with <strong>Contents: Read and write</strong> on <strong>' +
        esc(repoLabel) +
        "</strong>. Edits then save automatically and go live about a minute later. The token is stored only in this browser.</p>" +
        '<div class="modal-error" id="connect-error" hidden></div>' +
        '<div class="modal-ok" id="connect-ok" hidden></div>' +
        "<label>Token</label>" +
        '<input type="password" id="token-input" placeholder="github_pat_..." autocomplete="off">' +
        '<div class="modal-actions">' +
        (window.WB.gh.hasToken()
          ? '<button class="pill-btn" id="token-remove">Disconnect</button>'
          : "") +
        '<button class="pill-btn" id="token-cancel">Cancel</button>' +
        '<button class="pill-btn pill-solid" id="token-save">Connect</button>' +
        "</div>"
    );

    modal.querySelector("#token-cancel").addEventListener("click", closeModal);
    var removeBtn = modal.querySelector("#token-remove");
    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        window.WB.gh.setToken(null);
        closeModal();
        setStatus("Disconnected — saving on this device only", "");
      });
    }

    modal.querySelector("#token-save").addEventListener("click", async function () {
      var errEl = modal.querySelector("#connect-error");
      var okEl = modal.querySelector("#connect-ok");
      var btn = modal.querySelector("#token-save");
      var value = modal.querySelector("#token-input").value.trim();
      errEl.hidden = true;
      okEl.hidden = true;
      if (!value) {
        errEl.textContent = "Paste a token first.";
        errEl.hidden = false;
        return;
      }
      btn.disabled = true;
      btn.textContent = "Checking…";
      window.WB.gh.setToken(value);
      try {
        await window.WB.gh.verify();
        okEl.textContent = "Connected. Saving your current work…";
        okEl.hidden = false;
        setTimeout(function () {
          closeModal();
          commit({ manual: true });
        }, 700);
      } catch (err) {
        window.WB.gh.setToken(null);
        errEl.textContent = String(err.message || err);
        errEl.hidden = false;
        btn.disabled = false;
        btn.textContent = "Connect";
      }
    });
  }

  // ---------- typography panel ----------

  function openTypography() {
    var rows = window.WB.TYPO_ROLES.map(function (role) {
      var cfg = (data.typography && data.typography[role.key]) || {
        weight: 400,
        size: 14,
      };
      var opts = window.WB.WEIGHTS.map(function (w) {
        return (
          '<option value="' +
          w.value +
          '"' +
          (Number(cfg.weight) === w.value ? " selected" : "") +
          ">" +
          w.label +
          "</option>"
        );
      }).join("");
      return (
        '<div class="typo-row" data-role="' +
        role.key +
        '"><span>' +
        role.label +
        "</span>" +
        '<select data-typo="weight">' +
        opts +
        "</select>" +
        '<input type="number" data-typo="size" min="' +
        role.min +
        '" max="' +
        role.max +
        '" value="' +
        cfg.size +
        '"></div>'
      );
    }).join("");

    var modal = openModal(
      "<h3>Typography</h3>" +
        '<p class="hint">Everything is Helvetica — this sets the weight and size for each kind of text. Changes preview instantly.</p>' +
        rows +
        '<div class="modal-actions"><button class="pill-btn pill-solid" id="typo-done">Done</button></div>'
    );

    modal.addEventListener("input", function (e) {
      var row = e.target.closest(".typo-row");
      if (!row) return;
      var key = row.dataset.role;
      data.typography = data.typography || {};
      data.typography[key] = data.typography[key] || { weight: 400, size: 14 };
      if (e.target.dataset.typo === "weight") {
        data.typography[key].weight = Number(e.target.value);
      } else {
        var n = Number(e.target.value);
        if (!n) return;
        data.typography[key].size = n;
      }
      applyTypography();
      markDirty();
    });

    modal.querySelector("#typo-done").addEventListener("click", closeModal);
  }

  // ---------- pages panel ----------

  function openPages() {
    function rowHTML(page, isChild) {
      return (
        '<div class="page-row' +
        (isChild ? " child" : "") +
        '" data-page="' +
        esc(page.id) +
        '">' +
        '<input type="text" value="' +
        esc(page.title) +
        '" data-page-title>' +
        '<button class="del-btn" data-page-delete title="Delete">&times;</button>' +
        "</div>"
      );
    }

    var html = "<h3>Pages</h3>" +
      '<p class="hint">Rename pages, remove them, or add new ones. Deleting a page also deletes its photos from the site.</p>';

    (data.pages || []).forEach(function (page) {
      if (page.type === "group") {
        html += '<div class="group-heading">' + esc(page.title) + "</div>";
        html += rowHTML(page, false);
        (page.children || []).forEach(function (c) {
          html += rowHTML(c, true);
        });
        html +=
          '<div class="page-row child"><button class="pill-btn" data-add-child="' +
          esc(page.id) +
          '">+ Add page here</button></div>';
      } else {
        html += rowHTML(page, false);
      }
    });

    html +=
      '<div class="modal-actions">' +
      '<button class="pill-btn" id="add-top">+ Add top-level page</button>' +
      '<button class="pill-btn" id="add-group">+ Add section</button>' +
      '<button class="pill-btn pill-solid" id="pages-done">Done</button>' +
      "</div>";

    var modal = openModal(html);

    modal.addEventListener("input", function (e) {
      if (!e.target.matches("[data-page-title]")) return;
      var id = e.target.closest(".page-row").dataset.page;
      var page = findPage(data, id);
      if (!page) return;
      page.title = e.target.value;
      renderNav();
      markDirty();
    });

    modal.addEventListener("click", function (e) {
      var delBtn = e.target.closest("[data-page-delete]");
      if (delBtn) {
        var id = delBtn.closest(".page-row").dataset.page;
        var page = findPage(data, id);
        if (!page) return;
        if (!confirm('Delete "' + page.title + '"? Its photos will be removed from the site.')) return;
        var group = parentGroupOf(data, id);
        if (group) {
          group.children = group.children.filter(function (c) {
            return c.id !== id;
          });
        } else {
          data.pages = data.pages.filter(function (p) {
            return p.id !== id;
          });
        }
        if (currentId === id) {
          location.hash = "#/" + firstNavigablePage(data);
        }
        markDirty();
        closeModal();
        openPages();
        render();
        return;
      }

      var addChild = e.target.closest("[data-add-child]");
      if (addChild) {
        var groupId = addChild.dataset.addChild;
        var g = findPage(data, groupId);
        var title = prompt("Page name:");
        if (!title) return;
        var np = window.WB.galleryPage(title);
        np.id = uniquePageId(data, title);
        g.children = g.children || [];
        g.children.push(np);
        markDirty();
        closeModal();
        openPages();
        render();
        return;
      }

      if (e.target.id === "add-top") {
        var t = prompt("Page name:");
        if (!t) return;
        var p = window.WB.galleryPage(t);
        p.id = uniquePageId(data, t);
        data.pages.push(p);
        markDirty();
        closeModal();
        openPages();
        render();
        return;
      }

      if (e.target.id === "add-group") {
        var gt = prompt("Section name:");
        if (!gt) return;
        data.pages.push({
          id: uniquePageId(data, gt),
          title: gt,
          type: "group",
          children: [],
        });
        markDirty();
        closeModal();
        openPages();
        render();
        return;
      }

      if (e.target.id === "pages-done") closeModal();
    });
  }

  // ---------- photo actions ----------

  var replaceTargetId = null;

  async function addFiles(fileList) {
    var page = findPage(data, currentId);
    if (!page || page.type !== "gallery") {
      alert("Photos can only be added to a gallery page.");
      return;
    }
    page.photos = page.photos || [];
    var files = Array.from(fileList);
    var done = 0;
    setStatus("Processing 0/" + files.length + "…", "is-saving");

    for (var i = 0; i < files.length; i++) {
      try {
        var processed = await window.WB.processFile(files[i]);
        await window.WB.addPendingPhoto(processed);
        var place = window.WB.layout.defaultPlacement(page.photos);
        page.photos.push({
          id: processed.id,
          display: processed.displayPath,
          thumb: processed.thumbPath,
          width: processed.width,
          height: processed.height,
          caption: "",
          x: place.x,
          y: place.y,
          w: place.w,
        });
        done++;
        setStatus("Processing " + done + "/" + files.length + "…", "is-saving");
      } catch (err) {
        console.error(err);
      }
    }
    render();
    markDirty();
  }

  async function applyProcessedTo(photo, processed) {
    await window.WB.addPendingPhoto(processed);
    photo.display = processed.displayPath;
    photo.thumb = processed.thumbPath;
    photo.width = processed.width;
    photo.height = processed.height;
    render();
    markDirty();
  }

  function handlePhotoAction(action, photoId) {
    var page = findPage(data, currentId);
    if (!page || !page.photos) return;
    var idx = page.photos.findIndex(function (p) {
      return p.id === photoId;
    });
    if (idx === -1) return;
    var photo = page.photos[idx];

    if (action === "remove") {
      if (!confirm("Remove this photo from the page?")) return;
      page.photos.splice(idx, 1);
      render();
      markDirty();
      return;
    }

    if (action === "front") {
      page.photos.splice(idx, 1);
      page.photos.push(photo);
      render();
      markDirty();
      return;
    }

    if (action === "replace") {
      replaceTargetId = photoId;
      $("replace-input").click();
      return;
    }

    if (action === "crop") {
      var src = window.WB.resolveSrc(photo.display);
      var startAspect = photo.height && photo.width ? photo.height / photo.width : 1;
      window.WB.openCropper(src, startAspect, async function (dataUrl) {
        setStatus("Processing crop…", "is-saving");
        var processed = await window.WB.processDataUrl(dataUrl);
        applyProcessedTo(photo, processed);
      });
    }
  }

  function openLightbox(photo) {
    var root = $("modal-root");
    root.innerHTML =
      '<div class="lightbox"><button class="lightbox-close" aria-label="Close">&times;</button>' +
      '<img src="' +
      esc(window.WB.resolveSrc(photo.display)) +
      '" alt="' +
      esc(photo.caption || "") +
      '"></div>';
    root.querySelector(".lightbox").addEventListener("click", function (e) {
      if (e.target.tagName !== "IMG") root.innerHTML = "";
    });
  }

  // ---------- events ----------

  $("main").addEventListener("click", function (e) {
    var toolBtn = e.target.closest("[data-photo-action]");
    if (toolBtn) {
      e.stopPropagation();
      var block = toolBtn.closest("[data-photo-id]");
      handlePhotoAction(toolBtn.dataset.photoAction, block.dataset.photoId);
      return;
    }
    if (window.WB.isEditing()) return;
    var pb = e.target.closest("[data-photo-id]");
    if (!pb) return;
    var page = findPage(data, currentId);
    var photo = (page.photos || []).find(function (p) {
      return p.id === pb.dataset.photoId;
    });
    if (photo) openLightbox(photo);
  });

  $("main").addEventListener("focusout", function (e) {
    var el = e.target;
    if (!el.hasAttribute || !el.hasAttribute("contenteditable")) return;
    var page = findPage(data, currentId);
    if (!page) return;
    var text = el.textContent.trim();

    if (el.dataset.headerField) {
      page.header = page.header || window.WB.emptyHeader();
      page.header[el.dataset.headerField] = text;
    } else if (el.dataset.bodyField) {
      page.body = el.textContent;
    } else if (el.dataset.captionFor) {
      var photo = (page.photos || []).find(function (p) {
        return p.id === el.dataset.captionFor;
      });
      if (photo) photo.caption = text;
    }
    markDirty();
  });

  $("nav-content").addEventListener("click", function (e) {
    var toggle = e.target.closest("[data-group]");
    if (toggle) {
      var id = toggle.dataset.group;
      openGroups[id] = !openGroups[id];
      renderNav();
      return;
    }
    if (e.target.closest("a.nav-item")) closeNav();
  });

  function closeNav() {
    $("sidebar").classList.remove("open");
    $("nav-backdrop").classList.remove("open");
    $("nav-toggle").setAttribute("aria-expanded", "false");
  }

  $("nav-toggle").addEventListener("click", function () {
    var open = $("sidebar").classList.toggle("open");
    $("nav-backdrop").classList.toggle("open", open);
    this.setAttribute("aria-expanded", String(open));
  });
  $("nav-backdrop").addEventListener("click", closeNav);

  $("edit-site-btn").addEventListener("click", async function () {
    var auth = window.WB.getAuth();
    if (!auth) {
      var pw = prompt("Set a password for editing this site:");
      if (!pw) return;
      if (pw !== prompt("Confirm password:")) {
        alert("Passwords did not match.");
        return;
      }
      await window.WB.setPassword(pw);
    } else {
      var entered = prompt("Enter password to edit:");
      if (entered === null) return;
      if (!(await window.WB.verifyPassword(entered))) {
        alert("Incorrect password.");
        return;
      }
    }
    window.WB.setEditing(true);
    render();
    setStatus(
      window.WB.gh.hasToken()
        ? "Editing — changes save automatically"
        : "Editing — connect GitHub to publish",
      ""
    );
  });

  $("btn-exit-edit").addEventListener("click", async function () {
    if (dirtySinceCommit && window.WB.gh.hasToken()) await commit({ manual: true });
    window.WB.setEditing(false);
    closeModal();
    render();
  });

  $("btn-save-now").addEventListener("click", function () {
    commit({ manual: true });
  });
  $("btn-connect").addEventListener("click", openConnect);
  $("btn-typography").addEventListener("click", openTypography);
  $("btn-pages").addEventListener("click", openPages);
  $("btn-add-photo").addEventListener("click", function () {
    $("file-input").click();
  });

  $("file-input").addEventListener("change", function (e) {
    // FileList is live — copy it before resetting the input, or it empties.
    var files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length) addFiles(files);
  });

  $("replace-input").addEventListener("change", async function (e) {
    var file = e.target.files[0];
    e.target.value = "";
    if (!file || !replaceTargetId) return;
    var page = findPage(data, currentId);
    var photo = (page.photos || []).find(function (p) {
      return p.id === replaceTargetId;
    });
    replaceTargetId = null;
    if (!photo) return;
    setStatus("Processing…", "is-saving");
    var processed = await window.WB.processFile(file);
    applyProcessedTo(photo, processed);
  });

  window.addEventListener("hashchange", onHashChange);

  window.addEventListener("beforeunload", function (e) {
    if (dirtySinceCommit && window.WB.gh.hasToken() && window.WB.isEditing()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderPage, 180);
  });

  // ---------- boot ----------

  (async function init() {
    data = await window.WB.getData();
    // Restore photos staged but not yet published in an earlier session, so
    // they render instead of 404-ing.
    var restored = await window.WB.initPending();
    currentId = routeFromHash();
    var page = findPage(data, currentId);
    if (!page || page.type === "group") currentId = firstNavigablePage(data);
    render();
    if (window.WB.isEditing()) {
      if (restored) {
        dirtySinceCommit = true;
        setStatus(
          restored + " photo(s) waiting to publish — press Save now",
          ""
        );
      } else {
        setStatus(
          window.WB.gh.hasToken()
            ? "Editing — changes save automatically"
            : "Editing — connect GitHub to publish",
          ""
        );
      }
    }
  })();
})();
