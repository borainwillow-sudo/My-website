(function () {
  function openCropper(imageSrc, aspect, onApply) {
    var root = document.getElementById("modal-root");
    root.innerHTML = "";

    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    var box = document.createElement("div");
    box.className = "modal crop-modal";

    var title = document.createElement("h3");
    title.className = "modal-title";
    title.textContent = "crop photo";
    box.appendChild(title);

    var viewport = document.createElement("div");
    viewport.className = "crop-viewport";
    var vw = 300,
      vh = Math.round(vw / aspect);
    viewport.style.width = vw + "px";
    viewport.style.height = vh + "px";

    var img = new Image();
    img.className = "crop-image";
    viewport.appendChild(img);
    box.appendChild(viewport);

    var zoomWrap = document.createElement("label");
    zoomWrap.className = "crop-zoom-label";
    zoomWrap.textContent = "zoom";
    var zoom = document.createElement("input");
    zoom.type = "range";
    zoom.min = "1";
    zoom.max = "3";
    zoom.step = "0.01";
    zoom.value = "1";
    zoomWrap.appendChild(zoom);
    box.appendChild(zoomWrap);

    var actions = document.createElement("div");
    actions.className = "modal-actions";
    var applyBtn = document.createElement("button");
    applyBtn.className = "pill-btn pill-solid";
    applyBtn.textContent = "apply crop";
    var cancelBtn = document.createElement("button");
    cancelBtn.className = "pill-btn";
    cancelBtn.textContent = "cancel";
    actions.appendChild(applyBtn);
    actions.appendChild(cancelBtn);
    box.appendChild(actions);

    overlay.appendChild(box);
    root.appendChild(overlay);

    var baseScale = 1,
      tx = 0,
      ty = 0,
      natW = 0,
      natH = 0;

    function clamp() {
      var z = parseFloat(zoom.value);
      var scale = baseScale * z;
      var dispW = natW * scale,
        dispH = natH * scale;
      var minTx = vw - dispW,
        minTy = vh - dispH;
      tx = Math.min(0, Math.max(minTx, tx));
      ty = Math.min(0, Math.max(minTy, ty));
    }

    function applyTransform() {
      var z = parseFloat(zoom.value);
      var scale = baseScale * z;
      img.style.width = natW * scale + "px";
      img.style.height = natH * scale + "px";
      img.style.transform = "translate(" + tx + "px, " + ty + "px)";
    }

    img.onload = function () {
      natW = img.naturalWidth;
      natH = img.naturalHeight;
      baseScale = Math.max(vw / natW, vh / natH);
      tx = (vw - natW * baseScale) / 2;
      ty = (vh - natH * baseScale) / 2;
      applyTransform();
    };
    img.src = imageSrc;

    var dragging = false,
      startX = 0,
      startY = 0,
      startTx = 0,
      startTy = 0;

    viewport.addEventListener("pointerdown", function (e) {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startTx = tx;
      startTy = ty;
      viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      tx = startTx + (e.clientX - startX);
      ty = startTy + (e.clientY - startY);
      clamp();
      applyTransform();
    });
    viewport.addEventListener("pointerup", function () {
      dragging = false;
    });
    viewport.addEventListener("pointercancel", function () {
      dragging = false;
    });

    zoom.addEventListener("input", function () {
      clamp();
      applyTransform();
    });

    function close() {
      root.innerHTML = "";
    }

    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    applyBtn.addEventListener("click", function () {
      var z = parseFloat(zoom.value);
      var scale = baseScale * z;
      var cropX = -tx / scale,
        cropY = -ty / scale,
        cropW = vw / scale,
        cropH = vh / scale;
      var outW = 800,
        outH = Math.round(outW / aspect);
      var canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      canvas
        .getContext("2d")
        .drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
      var dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      close();
      onApply(dataUrl);
    });
  }

  window.WB = window.WB || {};
  window.WB.openCropper = openCropper;
})();
