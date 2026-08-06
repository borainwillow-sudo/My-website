(function () {
  // All photo geometry is stored in percentages of the canvas WIDTH — including
  // y — so a layout keeps its exact proportions at any screen size.
  var SNAP_PX = 6;
  var MIN_WIDTH_PCT = 4;

  function aspect(photo) {
    if (!photo.width || !photo.height) return 1;
    return photo.height / photo.width;
  }

  function heightPct(photo) {
    return photo.w * aspect(photo);
  }

  function contentBottom(photos) {
    var max = 0;
    photos.forEach(function (p) {
      var b = p.y + heightPct(p);
      if (b > max) max = b;
    });
    return max;
  }

  // Lays photos out and sizes the canvas to fit them.
  function applyPositions(canvas, photos) {
    var blocks = canvas.querySelectorAll("[data-photo-id]");
    blocks.forEach(function (el) {
      var photo = photos.find(function (p) {
        return p.id === el.dataset.photoId;
      });
      if (!photo) return;
      el.style.left = photo.x + "%";
      el.style.top = photo.y + "%";
      el.style.width = photo.w + "%";
    });
    var bottom = contentBottom(photos);
    // top/left percentages resolve against width, so height must too.
    canvas.style.paddingBottom = bottom > 0 ? bottom + "%" : "0";
  }

  function candidatesFor(photos, movingId) {
    var vertical = [0, 50, 100];
    var horizontal = [0];
    photos.forEach(function (p) {
      if (p.id === movingId) return;
      vertical.push(p.x, p.x + p.w / 2, p.x + p.w);
      var h = heightPct(p);
      horizontal.push(p.y, p.y + h / 2, p.y + h);
    });
    return { vertical: vertical, horizontal: horizontal };
  }

  // Finds the nearest guide for any of the moving box's edges.
  function snapAxis(edges, candidates, threshold) {
    var best = null;
    edges.forEach(function (edge) {
      candidates.forEach(function (c) {
        var delta = c - edge.value;
        if (Math.abs(delta) > threshold) return;
        if (!best || Math.abs(delta) < Math.abs(best.delta)) {
          best = { delta: delta, guide: c };
        }
      });
    });
    return best;
  }

  function renderGuides(overlay, vGuides, hGuides) {
    var html = "";
    vGuides.forEach(function (x) {
      html += '<div class="snap-guide snap-guide-v" style="left:' + x + '%"></div>';
    });
    hGuides.forEach(function (y) {
      html += '<div class="snap-guide snap-guide-h" style="top:' + y + '%"></div>';
    });
    overlay.innerHTML = html;
  }

  function enableEditing(canvas, photos, onChange) {
    var overlay = canvas.querySelector(".snap-overlay");
    var active = null;

    function pctPerPx() {
      var rect = canvas.getBoundingClientRect();
      return rect.width ? 100 / rect.width : 0;
    }

    function onPointerDown(e) {
      var handle = e.target.closest(".resize-handle");
      var block = e.target.closest("[data-photo-id]");
      if (!block || !canvas.contains(block)) return;
      var photo = photos.find(function (p) {
        return p.id === block.dataset.photoId;
      });
      if (!photo) return;

      e.preventDefault();
      var scale = pctPerPx();
      active = {
        photo: photo,
        block: block,
        mode: handle ? "resize" : "move",
        startX: e.clientX,
        startY: e.clientY,
        origX: photo.x,
        origY: photo.y,
        origW: photo.w,
        scale: scale,
      };
      block.classList.add("dragging");
      block.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!active) return;
      var dxPct = (e.clientX - active.startX) * active.scale;
      var dyPct = (e.clientY - active.startY) * active.scale;
      var threshold = SNAP_PX * active.scale;
      var cands = candidatesFor(photos, active.photo.id);
      var vGuides = [];
      var hGuides = [];

      if (active.mode === "move") {
        var nx = active.origX + dxPct;
        var ny = active.origY + dyPct;
        var w = active.photo.w;
        var h = heightPct(active.photo);

        var vSnap = snapAxis(
          [
            { value: nx },
            { value: nx + w / 2 },
            { value: nx + w },
          ],
          cands.vertical,
          threshold
        );
        if (vSnap) {
          nx += vSnap.delta;
          vGuides.push(vSnap.guide);
        }

        var hSnap = snapAxis(
          [
            { value: ny },
            { value: ny + h / 2 },
            { value: ny + h },
          ],
          cands.horizontal,
          threshold
        );
        if (hSnap) {
          ny += hSnap.delta;
          hGuides.push(hSnap.guide);
        }

        active.photo.x = Math.max(-w + MIN_WIDTH_PCT, Math.min(100 - MIN_WIDTH_PCT, nx));
        active.photo.y = Math.max(0, ny);
      } else {
        var nw = active.origW + dxPct;
        nw = Math.max(MIN_WIDTH_PCT, Math.min(100 - active.photo.x, nw));
        var rightEdge = active.photo.x + nw;
        var rSnap = snapAxis([{ value: rightEdge }], cands.vertical, threshold);
        if (rSnap) {
          nw += rSnap.delta;
          nw = Math.max(MIN_WIDTH_PCT, nw);
          vGuides.push(rSnap.guide);
        }
        active.photo.w = nw;
      }

      renderGuides(overlay, vGuides, hGuides);
      applyPositions(canvas, photos);
    }

    function endDrag(e) {
      if (!active) return;
      active.block.classList.remove("dragging");
      // Round so the saved JSON stays readable and diffs stay small.
      active.photo.x = Math.round(active.photo.x * 100) / 100;
      active.photo.y = Math.round(active.photo.y * 100) / 100;
      active.photo.w = Math.round(active.photo.w * 100) / 100;
      active = null;
      overlay.innerHTML = "";
      applyPositions(canvas, photos);
      if (onChange) onChange();
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
  }

  // Places a newly added photo below everything else, at a sensible width.
  function defaultPlacement(photos) {
    var bottom = contentBottom(photos);
    return {
      x: 8,
      y: bottom > 0 ? bottom + 4 : 4,
      w: 34,
    };
  }

  window.WB = window.WB || {};
  Object.assign(window.WB, {
    layout: {
      applyPositions: applyPositions,
      enableEditing: enableEditing,
      defaultPlacement: defaultPlacement,
      heightPct: heightPct,
      contentBottom: contentBottom,
    },
  });
})();
