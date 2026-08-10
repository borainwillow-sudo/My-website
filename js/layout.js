(function () {
  // All photo geometry is stored in percentages of the canvas WIDTH — including
  // y — so a layout keeps its exact proportions at any screen size.
  //
  // y therefore cannot be written to CSS `top` as a percentage: for an
  // absolutely positioned element a percentage top resolves against the
  // container's HEIGHT, and the container grows as photos are added, which
  // silently moved every existing photo. y is converted to pixels here
  // instead, and recomputed whenever the canvas width changes.
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

  // Below this width the canvas becomes a plain stacked grid and the
  // free-form coordinates don't apply.
  function isStacked() {
    return window.matchMedia("(max-width: 820px)").matches;
  }

  // Lays photos out and sizes the canvas to fit them.
  function applyPositions(canvas, photos) {
    var blocks = canvas.querySelectorAll("[data-photo-id]");

    if (isStacked()) {
      // Hand layout back to the grid.
      canvas.style.height = "";
      blocks.forEach(function (el) {
        el.style.left = "";
        el.style.top = "";
        el.style.width = "";
      });
      return;
    }

    var width = canvas.clientWidth;
    blocks.forEach(function (el) {
      var photo = photos.find(function (p) {
        return p.id === el.dataset.photoId;
      });
      if (!photo) return;
      el.style.left = photo.x + "%";
      el.style.top = (photo.y / 100) * width + "px";
      el.style.width = photo.w + "%";
    });

    // Measure the real blocks rather than trusting the image ratios: a caption
    // adds height below the photo and would otherwise be clipped off the end.
    var bottom = 0;
    blocks.forEach(function (el) {
      var b = el.offsetTop + el.offsetHeight;
      if (b > bottom) bottom = b;
    });
    canvas.style.height = bottom > 0 ? bottom + "px" : "";
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
      // The tool buttons and the editable caption live inside the photo block,
      // and the preventDefault below would swallow their click and focus. Let
      // those through untouched.
      if (
        e.target.closest(".photo-tools") ||
        e.target.closest(".link-flag") ||
        e.target.closest("[contenteditable]")
      ) {
        return;
      }
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

  var TOP_MARGIN = 4;
  var GAP = 4;

  // New photos go at the top of the page, where they can be seen and arranged
  // without scrolling past everything already there.
  function topPlacement() {
    return { x: 8, y: TOP_MARGIN, w: 34 };
  }

  // Moves the named photos down to make room. Every one shifts by the same
  // amount, so an arrangement keeps its exact shape — it just sits lower.
  function shiftDown(photos, ids, amount) {
    photos.forEach(function (p) {
      if (ids[p.id]) p.y = Math.round((p.y + amount) * 100) / 100;
    });
  }

  // Kept for callers that still want the old below-everything behaviour.
  function defaultPlacement(photos) {
    var bottom = contentBottom(photos);
    return {
      x: 8,
      y: bottom > 0 ? bottom + GAP : TOP_MARGIN,
      w: 34,
    };
  }

  window.WB = window.WB || {};
  Object.assign(window.WB, {
    layout: {
      applyPositions: applyPositions,
      enableEditing: enableEditing,
      defaultPlacement: defaultPlacement,
      topPlacement: topPlacement,
      shiftDown: shiftDown,
      GAP: GAP,
      heightPct: heightPct,
      contentBottom: contentBottom,
    },
  });
})();
