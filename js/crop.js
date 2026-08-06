(function () {
  // Free-aspect cropper: the output keeps whatever shape the viewport is set
  // to, and the viewport follows the photo's current aspect ratio so cropping
  // never silently reshapes a photo unless the user drags the ratio control.
  function openCropper(imageSrc, startAspect, onApply) {
    var root = document.getElementById("modal-root");
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    var box = document.createElement("div");
    box.className = "modal";
    box.innerHTML =
      "<h3>Crop photo</h3>" +
      '<p class="hint">Drag the photo to reposition, zoom to scale, and set the shape of the crop. The full-resolution file is re-cut from your original.</p>';

    var vw = 420;
    var aspect = startAspect || 1;
    var viewport = document.createElement("div");
    viewport.className = "crop-viewport";

    var img = new Image();
    img.className = "crop-image";
    img.crossOrigin = "anonymous";
    viewport.appendChild(img);
    box.appendChild(viewport);

    var zoomRow = document.createElement("div");
    zoomRow.className = "crop-controls";
    zoomRow.innerHTML = "<span>Zoom</span>";
    var zoom = document.createElement("input");
    zoom.type = "range";
    zoom.min = "1";
    zoom.max = "4";
    zoom.step = "0.01";
    zoom.value = "1";
    zoomRow.appendChild(zoom);
    box.appendChild(zoomRow);

    var ratioRow = document.createElement("div");
    ratioRow.className = "crop-controls";
    ratioRow.innerHTML = "<span>Shape</span>";
    var ratio = document.createElement("input");
    ratio.type = "range";
    ratio.min = "0.5";
    ratio.max = "2";
    ratio.step = "0.01";
    ratio.value = String(aspect);
    ratioRow.appendChild(ratio);
    var ratioReset = document.createElement("button");
    ratioReset.className = "pill-btn";
    ratioReset.textContent = "Original";
    ratioRow.appendChild(ratioReset);
    box.appendChild(ratioRow);

    var actions = document.createElement("div");
    actions.className = "modal-actions";
    var cancelBtn = document.createElement("button");
    cancelBtn.className = "pill-btn";
    cancelBtn.textContent = "Cancel";
    var applyBtn = document.createElement("button");
    applyBtn.className = "pill-btn pill-solid";
    applyBtn.textContent = "Apply crop";
    actions.appendChild(cancelBtn);
    actions.appendChild(applyBtn);
    box.appendChild(actions);

    overlay.appendChild(box);
    root.appendChild(overlay);

    var vh = Math.round(vw * aspect);
    var baseScale = 1,
      tx = 0,
      ty = 0,
      natW = 0,
      natH = 0;

    function sizeViewport() {
      vh = Math.round(vw * aspect);
      viewport.style.width = vw + "px";
      viewport.style.height = vh + "px";
    }

    function fit() {
      if (!natW) return;
      baseScale = Math.max(vw / natW, vh / natH);
      var z = parseFloat(zoom.value);
      tx = (vw - natW * baseScale * z) / 2;
      ty = (vh - natH * baseScale * z) / 2;
      clamp();
      applyTransform();
    }

    function clamp() {
      var scale = baseScale * parseFloat(zoom.value);
      tx = Math.min(0, Math.max(vw - natW * scale, tx));
      ty = Math.min(0, Math.max(vh - natH * scale, ty));
    }

    function applyTransform() {
      var scale = baseScale * parseFloat(zoom.value);
      img.style.width = natW * scale + "px";
      img.style.height = natH * scale + "px";
      img.style.transform = "translate(" + tx + "px," + ty + "px)";
    }

    sizeViewport();

    img.onload = function () {
      natW = img.naturalWidth;
      natH = img.naturalHeight;
      fit();
    };
    img.src = imageSrc;

    var dragging = false,
      sx = 0,
      sy = 0,
      stx = 0,
      sty = 0;

    viewport.addEventListener("pointerdown", function (e) {
      dragging = true;
      sx = e.clientX;
      sy = e.clientY;
      stx = tx;
      sty = ty;
      viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      tx = stx + (e.clientX - sx);
      ty = sty + (e.clientY - sy);
      clamp();
      applyTransform();
    });
    ["pointerup", "pointercancel"].forEach(function (ev) {
      viewport.addEventListener(ev, function () {
        dragging = false;
      });
    });

    zoom.addEventListener("input", function () {
      clamp();
      applyTransform();
    });

    ratio.addEventListener("input", function () {
      aspect = parseFloat(ratio.value);
      sizeViewport();
      fit();
    });

    ratioReset.addEventListener("click", function () {
      aspect = natH / natW;
      ratio.value = String(aspect);
      sizeViewport();
      fit();
    });

    function close() {
      root.innerHTML = "";
    }

    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    applyBtn.addEventListener("click", function () {
      var scale = baseScale * parseFloat(zoom.value);
      var cropX = -tx / scale;
      var cropY = -ty / scale;
      var cropW = vw / scale;
      var cropH = vh / scale;
      // Render from the source pixels so we keep the original resolution.
      var outW = Math.round(Math.min(cropW, natW));
      var outH = Math.round(outW * aspect);
      var canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      var ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
      var dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      close();
      onApply(dataUrl);
    });
  }

  window.WB = window.WB || {};
  window.WB.openCropper = openCropper;
})();
