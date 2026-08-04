(function () {
  var STATE = { homeIndex: 0 };
  var pendingUpload = null;

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  function findProject(data, slug) {
    for (var i = 0; i < data.categories.length; i++) {
      var cat = data.categories[i];
      for (var j = 0; j < cat.projects.length; j++) {
        if (cat.projects[j].id === slug) return cat.projects[j];
      }
    }
    return null;
  }

  function findProjectCategory(data, projectId) {
    for (var i = 0; i < data.categories.length; i++) {
      var cat = data.categories[i];
      if (cat.projects.some(function (p) { return p.id === projectId; })) return cat;
    }
    return null;
  }

  function uniqueSlug(data, base) {
    var slug = base || "project";
    var candidate = slug;
    var n = 1;
    function exists(s) {
      return data.categories.some(function (c) {
        return c.projects.some(function (p) { return p.id === s; });
      });
    }
    while (exists(candidate)) {
      n++;
      candidate = slug + "-" + n;
    }
    return candidate;
  }

  // ---------- rendering ----------

  function renderNav(data) {
    var nav = document.getElementById("nav-content");
    var html = '<a href="#/" class="nav-link nav-home">home</a>';
    data.categories.forEach(function (cat) {
      html += '<h3 class="nav-cat">' + escapeHtml(cat.name) + "</h3>";
      cat.projects.forEach(function (p) {
        html +=
          '<a href="#/project/' +
          encodeURIComponent(p.id) +
          '" class="nav-link">' +
          escapeHtml(p.name) +
          " (" +
          escapeHtml(p.year) +
          ")</a>";
      });
    });
    if (WB.isEditing()) {
      html +=
        '<a href="#/manage-projects" class="nav-link nav-manage">manage projects</a>';
    }
    nav.innerHTML = html;
  }

  function renderPhotoCard(photo, fallbackCaption) {
    if (!photo) return '<div class="photo-frame empty">no photo</div>';
    if (photo.image) {
      return (
        '<div class="photo-frame"><img src="' +
        photo.image +
        '" alt="' +
        escapeHtml(photo.caption || "") +
        '"></div>'
      );
    }
    return (
      '<div class="photo-frame placeholder">' +
      '<div class="ph-caption">' +
      escapeHtml(photo.caption || fallbackCaption) +
      "</div>" +
      '<div class="ph-note">please upload this photo</div>' +
      "</div>"
    );
  }

  function renderHomeHTML(data) {
    var photos = data.home.photos;
    var i = Math.max(0, Math.min(STATE.homeIndex, photos.length - 1));
    STATE.homeIndex = i;
    var photo = photos[i] || null;
    var editing = WB.isEditing();

    return (
      '<section class="hero">' +
      '<div class="photo-nav">' +
      (photos.length > 1
        ? '<button class="arrow-btn" data-action="home-prev" aria-label="Previous">&lsaquo;</button>'
        : "") +
      renderPhotoCard(photo, data.siteName) +
      (photos.length > 1
        ? '<button class="arrow-btn" data-action="home-next" aria-label="Next">&rsaquo;</button>'
        : "") +
      "</div>" +
      '<p class="caption site-caption" ' +
      (editing ? 'contenteditable="true" data-field="siteName"' : "") +
      ">" +
      escapeHtml(data.siteName) +
      "</p>" +
      (editing
        ? '<div class="photo-edit-actions" data-scope="home" data-index="' +
          i +
          '">' +
          '<button class="link-btn" data-action="replace-photo">replace photo</button>' +
          '<button class="link-btn" data-action="crop-photo">crop photo</button>' +
          '<button class="link-btn danger" data-action="remove-photo">remove this photo</button>' +
          '<button class="link-btn muted" data-action="add-photo">+ add photo</button>' +
          "</div>"
        : "") +
      "</section>"
    );
  }

  function renderProjectHTML(data, project) {
    var editing = WB.isEditing();
    var photosHtml = project.photos
      .map(function (photo, i) {
        return (
          '<div class="photo-block">' +
          renderPhotoCard(photo, project.name + " #" + (i + 1)) +
          '<p class="caption" ' +
          (editing
            ? 'contenteditable="true" data-field="caption" data-scope="project" data-project="' +
              project.id +
              '" data-index="' +
              i +
              '"'
            : "") +
          ">" +
          escapeHtml(photo.caption || project.name + " #" + (i + 1)) +
          "</p>" +
          (editing
            ? '<div class="photo-edit-actions" data-scope="project" data-project="' +
              project.id +
              '" data-index="' +
              i +
              '">' +
              '<button class="link-btn" data-action="replace-photo">replace photo</button>' +
              '<button class="link-btn" data-action="crop-photo">crop photo</button>' +
              '<button class="link-btn danger" data-action="remove-photo">remove this photo</button>' +
              "</div>"
            : "") +
          "</div>"
        );
      })
      .join("");

    return (
      '<section class="project-page">' +
      '<h1 class="project-title" ' +
      (editing
        ? 'contenteditable="true" data-field="name" data-scope="project-meta" data-project="' +
          project.id +
          '"'
        : "") +
      ">" +
      escapeHtml(project.name) +
      "</h1>" +
      '<p class="project-year" ' +
      (editing
        ? 'contenteditable="true" data-field="year" data-scope="project-meta" data-project="' +
          project.id +
          '"'
        : "") +
      ">" +
      escapeHtml(project.year) +
      "</p>" +
      '<div class="photo-list">' +
      photosHtml +
      "</div>" +
      (editing
        ? '<button class="link-btn muted add-photo-standalone" data-action="add-photo" data-scope="project" data-project="' +
          project.id +
          '">+ add photo</button>'
        : "") +
      "</section>"
    );
  }

  function renderManageHTML(data) {
    var html =
      '<section class="manage-page">' +
      '<h1 class="site-title" contenteditable="true" data-field="siteName">' +
      escapeHtml(data.siteName) +
      "</h1>";
    data.categories.forEach(function (cat) {
      html += '<h2 class="manage-cat">' + escapeHtml(cat.name) + "</h2>";
      html += '<div class="manage-list">';
      cat.projects.forEach(function (p) {
        html +=
          '<div class="manage-item" data-category="' +
          cat.id +
          '" data-project="' +
          p.id +
          '">' +
          '<span class="chip-field" contenteditable="true" data-field="name">' +
          escapeHtml(p.name) +
          "</span> (" +
          '<span class="chip-field" contenteditable="true" data-field="year">' +
          escapeHtml(p.year) +
          "</span>) " +
          '<button class="del-btn" data-action="delete-project" title="delete project">&times;</button>' +
          "</div>";
      });
      html +=
        '<button class="link-btn muted" data-action="add-project" data-category="' +
        cat.id +
        '">+ add project</button>';
      html += "</div>";
    });
    html += "</section>";
    return html;
  }

  function renderNotFound() {
    return '<section class="not-found"><p>not found</p><a href="#/">back home</a></section>';
  }

  async function renderRoute() {
    var data = await WB.getData();
    window.__DATA__ = data;
    renderNav(data);
    updateEditUI();

    var hash = location.hash.replace(/^#/, "") || "/";
    var app = document.getElementById("app");

    if (hash === "/") {
      app.innerHTML = renderHomeHTML(data);
    } else if (hash.indexOf("/project/") === 0) {
      var slug = decodeURIComponent(hash.split("/")[2] || "");
      var project = findProject(data, slug);
      app.innerHTML = project ? renderProjectHTML(data, project) : renderNotFound();
    } else if (hash === "/manage-projects") {
      if (!WB.isEditing()) {
        location.hash = "#/";
        return;
      }
      app.innerHTML = renderManageHTML(data);
    } else {
      app.innerHTML = renderNotFound();
    }
  }

  // ---------- edit interactions ----------

  document.getElementById("app").addEventListener("click", async function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.dataset.action;
    var data = window.__DATA__;

    if (action === "home-prev") {
      STATE.homeIndex = Math.max(0, STATE.homeIndex - 1);
      renderRoute();
      return;
    }
    if (action === "home-next") {
      STATE.homeIndex = Math.min(data.home.photos.length - 1, STATE.homeIndex + 1);
      renderRoute();
      return;
    }

    if (
      action === "replace-photo" ||
      action === "crop-photo" ||
      action === "remove-photo"
    ) {
      var scopeEl = btn.closest("[data-scope]");
      var scope = scopeEl.dataset.scope;
      var projectId = scopeEl.dataset.project;
      var index = parseInt(scopeEl.dataset.index, 10);
      var list =
        scope === "home" ? data.home.photos : findProject(data, projectId).photos;

      if (action === "remove-photo") {
        if (!confirm("Remove this photo?")) return;
        list.splice(index, 1);
        if (list.length === 0) {
          var fallback =
            scope === "home"
              ? data.siteName
              : findProject(data, projectId).name + " #1";
          list.push(WB.placeholderPhoto(fallback));
        }
        if (scope === "home") STATE.homeIndex = Math.min(STATE.homeIndex, list.length - 1);
        WB.saveDraft(data);
        renderRoute();
        return;
      }

      if (action === "replace-photo") {
        pendingUpload = { scope: scope, projectId: projectId, index: index };
        document.getElementById("file-input").click();
        return;
      }

      if (action === "crop-photo") {
        var photo = list[index];
        if (!photo.image) {
          alert("Upload a photo before cropping.");
          return;
        }
        WB.openCropper(photo.image, 4 / 5, function (dataUrl) {
          photo.image = dataUrl;
          WB.saveDraft(data);
          renderRoute();
        });
        return;
      }
    }

    if (action === "add-photo") {
      var scopeEl2 = btn.closest("[data-scope]");
      var scope2 = scopeEl2.dataset.scope;
      if (scope2 === "home") {
        data.home.photos.push(WB.placeholderPhoto(data.siteName));
        STATE.homeIndex = data.home.photos.length - 1;
      } else {
        var project2 = findProject(data, scopeEl2.dataset.project);
        project2.photos.push(
          WB.placeholderPhoto(project2.name + " #" + (project2.photos.length + 1))
        );
      }
      WB.saveDraft(data);
      renderRoute();
      return;
    }

    if (action === "add-project") {
      var categoryId = btn.dataset.category;
      var name = prompt("Project name:");
      if (!name) return;
      var year = prompt("Year (e.g. 2026 or 2025-2026):") || "";
      var cat = data.categories.find(function (c) { return c.id === categoryId; });
      var id = uniqueSlug(data, WB.slugify(name));
      cat.projects.push({
        id: id,
        name: name,
        year: year,
        photos: [WB.placeholderPhoto(name + " #1")],
      });
      WB.saveDraft(data);
      renderRoute();
      return;
    }

    if (action === "delete-project") {
      var item = btn.closest(".manage-item");
      var categoryId2 = item.dataset.category;
      var projectId2 = item.dataset.project;
      if (!confirm("Delete this project and all its photos?")) return;
      var cat2 = data.categories.find(function (c) { return c.id === categoryId2; });
      cat2.projects = cat2.projects.filter(function (p) { return p.id !== projectId2; });
      WB.saveDraft(data);
      renderRoute();
      return;
    }
  });

  document.getElementById("app").addEventListener("focusout", function (e) {
    var el = e.target;
    if (!el.hasAttribute || !el.hasAttribute("contenteditable")) return;
    var data = window.__DATA__;
    var field = el.dataset.field;
    var text = el.textContent.trim();

    if (field === "siteName") {
      data.siteName = text || data.siteName;
    } else if (el.classList.contains("chip-field")) {
      var item = el.closest(".manage-item");
      var cat = data.categories.find(function (c) { return c.id === item.dataset.category; });
      var project = cat.projects.find(function (p) { return p.id === item.dataset.project; });
      if (field === "name") project.name = text || project.name;
      if (field === "year") project.year = text;
    } else if (el.dataset.scope === "project-meta") {
      var project2 = findProject(data, el.dataset.project);
      if (field === "name") project2.name = text || project2.name;
      if (field === "year") project2.year = text;
    } else if (field === "caption") {
      var project3 = findProject(data, el.dataset.project);
      project3.photos[parseInt(el.dataset.index, 10)].caption = text;
    }

    WB.saveDraft(data);
    renderNav(data);
  });

  document.getElementById("file-input").addEventListener("change", async function (e) {
    var file = e.target.files[0];
    e.target.value = "";
    if (!file || !pendingUpload) return;
    var dataUrl = await WB.resizeImage(file, 1600, 0.85);
    var data = window.__DATA__;
    var list =
      pendingUpload.scope === "home"
        ? data.home.photos
        : findProject(data, pendingUpload.projectId).photos;
    list[pendingUpload.index].image = dataUrl;
    pendingUpload = null;
    try {
      WB.saveDraft(data);
    } catch (err) {
      alert("Could not save — browser storage is full. Try removing other photos first.");
    }
    renderRoute();
  });

  // ---------- edit bar / auth ----------

  function updateEditUI() {
    var editing = WB.isEditing();
    document.getElementById("edit-bar").hidden = !editing;
    document.getElementById("edit-site-btn").hidden = editing;
    document.body.classList.toggle("is-editing", editing);
  }

  document.getElementById("edit-site-btn").addEventListener("click", async function () {
    var auth = WB.getAuth();
    if (!auth) {
      var pw = prompt("Set a password for editing this site:");
      if (!pw) return;
      var confirmPw = prompt("Confirm password:");
      if (pw !== confirmPw) {
        alert("Passwords did not match.");
        return;
      }
      await WB.setPassword(pw);
      WB.setEditing(true);
    } else {
      var enter = prompt("Enter password to edit:");
      if (enter === null) return;
      var ok = await WB.verifyPassword(enter);
      if (!ok) {
        alert("Incorrect password.");
        return;
      }
      WB.setEditing(true);
    }
    renderRoute();
  });

  document.getElementById("btn-exit-edit").addEventListener("click", function () {
    WB.setEditing(false);
    if (location.hash === "#/manage-projects") {
      location.hash = "#/";
    } else {
      renderRoute();
    }
  });

  document.getElementById("btn-publish").addEventListener("click", function () {
    WB.publishSite(window.__DATA__);
    alert(
      'data.json downloaded. To make these changes visible to every visitor, replace data.json in the repository with this file (or send it to me) and redeploy. Your edits stay visible in this browser either way.'
    );
  });

  document.getElementById("btn-export").addEventListener("click", function () {
    WB.exportData(window.__DATA__);
  });

  document.getElementById("btn-import").addEventListener("click", function () {
    document.getElementById("import-input").click();
  });

  document.getElementById("import-input").addEventListener("change", async function (e) {
    var file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      var text = await file.text();
      var parsed = JSON.parse(text);
      if (!parsed.siteName || !Array.isArray(parsed.categories)) {
        throw new Error("bad shape");
      }
      WB.saveDraft(parsed);
      STATE.homeIndex = 0;
      renderRoute();
    } catch (err) {
      alert("Could not import that file — make sure it's a valid data.json export.");
    }
  });

  document.getElementById("btn-change-pw").addEventListener("click", async function () {
    var auth = WB.getAuth();
    if (auth) {
      var current = prompt("Current password:");
      if (current === null) return;
      var ok = await WB.verifyPassword(current);
      if (!ok) {
        alert("Incorrect password.");
        return;
      }
    }
    var next = prompt("New password:");
    if (!next) return;
    var confirmNext = prompt("Confirm new password:");
    if (next !== confirmNext) {
      alert("Passwords did not match.");
      return;
    }
    await WB.setPassword(next);
    alert("Password updated.");
  });

  document.getElementById("btn-reset").addEventListener("click", async function () {
    if (!confirm("Reset all content back to the published defaults? This discards local edits.")) return;
    var data = await WB.resetToDefaults();
    window.__DATA__ = data;
    STATE.homeIndex = 0;
    renderRoute();
  });

  // ---------- nav drawer ----------

  function closeNav() {
    document.getElementById("nav-drawer").classList.remove("open");
    document.getElementById("nav-backdrop").classList.remove("open");
  }

  document.getElementById("nav-toggle").addEventListener("click", function () {
    document.getElementById("nav-drawer").classList.toggle("open");
    document.getElementById("nav-backdrop").classList.toggle("open");
  });
  document.getElementById("nav-backdrop").addEventListener("click", closeNav);
  document.getElementById("nav-content").addEventListener("click", function (e) {
    if (e.target.matches("a.nav-link")) closeNav();
  });

  // ---------- bootstrap ----------

  window.addEventListener("hashchange", renderRoute);
  updateEditUI();
  renderRoute();
})();
