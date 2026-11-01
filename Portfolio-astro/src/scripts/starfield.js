(function () {
  // Seeded PRNG so the scatter stays stable across resizes instead of
  // reshuffling every redraw. Fixed seed, not cryptographic.
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussianRandom(rand) {
    var u1 = Math.max(rand(), 1e-6);
    var u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // Dark mode: white stars on near-black, the literal night-sky look.
  // Light mode: a warm solid gold rather than white-on-white (which
  // would be invisible) - what you'd actually picture a star looking
  // like against a bright daytime backdrop, with higher alpha/size
  // floors since a tinted dot needs more weight than a white one to
  // read clearly on a light ground.
  function starPalette() {
    var isLight = document.documentElement.getAttribute("data-theme") === "light";
    return isLight
      ? { rgb: "232,168,38", alphaMin: 0.32, alphaRange: 0.45, radiusMin: 0.5, radiusRange: 1.2 }
      : { rgb: "255,255,255", alphaMin: 0.12, alphaRange: 0.4, radiusMin: 0.4, radiusRange: 1.1 };
  }

  function drawMilkyWayBand(ctx, w, h, rand, palette) {
    var cx = w / 2;
    var cy = h / 2;
    var angle = -22 * (Math.PI / 180);
    var bandLength = Math.max(w, h) * 1.8;
    var bandWidth = Math.min(w, h) * 0.46;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.filter = "blur(26px)";
    var haze = ctx.createLinearGradient(0, -bandWidth / 2, 0, bandWidth / 2);
    haze.addColorStop(0, "rgba(" + palette.rgb + ",0)");
    haze.addColorStop(0.5, "rgba(" + palette.rgb + ",0.06)");
    haze.addColorStop(1, "rgba(" + palette.rgb + ",0)");
    ctx.fillStyle = haze;
    ctx.fillRect(-bandLength / 2, -bandWidth / 2, bandLength, bandWidth);
    ctx.filter = "none";
    ctx.restore();

    var bandStarCount = Math.round((w * h) / 260);
    for (var i = 0; i < bandStarCount; i++) {
      var along = (rand() - 0.5) * bandLength;
      var across = gaussianRandom(rand) * (bandWidth * 0.18);
      var worldX = cx + along * Math.cos(angle) - across * Math.sin(angle);
      var worldY = cy + along * Math.sin(angle) + across * Math.cos(angle);
      if (worldX < -5 || worldX > w + 5 || worldY < -5 || worldY > h + 5) continue;
      var r = palette.radiusMin + rand() * palette.radiusRange;
      var alpha = palette.alphaMin + rand() * palette.alphaRange;
      ctx.beginPath();
      ctx.arc(worldX, worldY, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + palette.rgb + "," + alpha.toFixed(2) + ")";
      ctx.fill();
    }
  }

  function draw(canvas, ctx) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (w === 0 || h === 0) return;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var palette = starPalette();
    var rand = mulberry32(20261031);
    drawMilkyWayBand(ctx, w, h, rand, palette);

    var scatterCount = Math.round((w * h) / 1300);
    for (var i = 0; i < scatterCount; i++) {
      var x = rand() * w;
      var y = rand() * h;
      var r = palette.radiusMin + rand() * palette.radiusRange;
      var alpha = palette.alphaMin + rand() * palette.alphaRange;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + palette.rgb + "," + alpha.toFixed(2) + ")";
      ctx.fill();
    }
  }

  var canvas = document.getElementById("starfield");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var frame = null;
  function redraw() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      draw(canvas, ctx);
    });
  }
  redraw();

  var debounceTimer = null;
  window.addEventListener("resize", function () {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(redraw, 120);
  });

  // Theme can flip live via the Light/Auto/Dark switch - watch
  // data-theme on <html> and redraw in the new palette immediately
  // instead of only picking it up on the next full page load.
  var themeObserver = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === "data-theme") {
        redraw();
        break;
      }
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
