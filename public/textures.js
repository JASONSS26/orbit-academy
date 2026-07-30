/* textures.js — planet-texture resolution for every simulator, and a loud failure if the 3-D
   library is missing. Include this immediately AFTER the three.js tag:

       <script src="textures.js"></script>

   WHY THIS EXISTS
   The sims want photographic Earth/Moon maps, which historically came straight off a CDN. That
   makes the course dependent on the open internet for something it should own. So each texture is
   now resolved through a chain, first hit wins:

     1. public/vendor/textures/earth_atmos_2048.jpg   — the photographic map. COMMITTED to the repo.
     2. the pinned CDN copy                           — only if ALLOW_CDN below is true. Never
                                                        reached in a default tree.
     3. public/vendor/textures/earth_schematic.jpg     — COMMITTED, and drawn by us. The fallback if
                                                        a site strips the NASA-derived photo maps.

   Every one of those files is in the repository, so the chain resolves on hop 1 and the course is
   fully self-contained with no network at all. See public/vendor/NOTICE.md for hashes and licenses.

   The step-3 fallback is deliberately SCHEMATIC rather than a fabricated photo: ocean blue with a
   15° graticule, a gold equator, dashed tropics/polar circles and a green prime meridian. We have no
   coastline data to draw a truthful Earth offline, and inventing continents would put wrong
   geography in front of students. The grid is also genuinely useful — you can count meridians to
   watch Earth rotate and read inclination straight off it. Regenerate with tools/make-textures.py.

   DEFAULT POSTURE: ALLOW_CDN is FALSE and the sims load three.js from public/vendor/, i.e. the
   course is fully local out of the box and makes no outbound request of any kind. Nothing needs
   fetching — every asset is committed. Verify a tree with `bash tools/fetch-vendor.sh --check`;
   `--cdn` restores the pinned-CDN behaviour for anyone who would rather not vendor. */
'use strict';
const ALLOW_CDN = false;     // DEFAULT: fully local, no outbound attempt. `tools/go-offline.sh --cdn` flips it.

(function () {
  // ---- Fail loudly if three.js never arrived. A blank canvas is the worst possible symptom: it
  // looks like broken physics rather than a missing file, and offline installs hit it first.
  if (typeof window.THREE === 'undefined') {
    var say = function () {
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;' +
        'justify-content:center;background:#050a14;color:#cfe3ff;font:16px/1.6 system-ui,sans-serif;padding:6vw';
      var box = document.createElement('div');
      box.style.cssText = 'max-width:640px;border:1px solid #2b4a70;border-radius:12px;padding:22px 26px;background:#0a1626';
      var h = document.createElement('h2');
      h.style.cssText = 'margin:0 0 10px;color:#ff8a80;font-size:21px';
      h.textContent = '3-D library not loaded';
      var p1 = document.createElement('p');
      p1.textContent = 'This simulator needs three.js, and the browser could not fetch it. Nothing is '
        + 'wrong with the course content — only the library is missing.';
      var p2 = document.createElement('p');
      p2.innerHTML = 'If this machine is offline, run <code style="color:#ffcf4d">bash tools/fetch-vendor.sh</code>'
        + ' once on a networked machine to vendor the library into <code>public/vendor/</code>, then copy the'
        + ' folder across. If you are online, check whether a proxy or extension is blocking the pinned CDN.';
      box.appendChild(h); box.appendChild(p1); box.appendChild(p2); d.appendChild(box);
      document.body.appendChild(d);
    };
    if (document.body) say(); else document.addEventListener('DOMContentLoaded', say);
    return;                                   // no THREE ⇒ nothing below can work
  }

  var CDN = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/';
  var SRC = {
    /* *_hires.jpg are the NASA originals added by tools/fetch-hires.sh — optional and absent by
       default, so they lead the chain and the shipped maps stay as fallbacks. */
    earth: ['vendor/textures/earth_hires.jpg', 'vendor/textures/earth_atmos_2048.jpg', CDN + 'earth_atmos_2048.jpg', 'vendor/textures/earth_schematic.jpg'],
    /* moon_hires.jpg is the NASA LRO mosaic, added by tools/fetch-moon-hires.sh. It is optional and
       absent by default, so it leads the chain and the 1024x512 three.js map stays as the fallback. */
    moon:  ['vendor/textures/moon_hires.jpg', 'vendor/textures/moon_1024.jpg', CDN + 'moon_1024.jpg', 'vendor/textures/moon_schematic.jpg']
  };
  /* Read winpix.js lazily rather than at load time, so the script order of the two tags does not
     matter. When present, the baked data: URL goes FIRST — see the crossOrigin note below for why
     that is what makes an offline install look right. */
  function baked(which) {
    var w = window.OA_WINPIX;
    return (w && w[which]) ? w[which] : null;
  }
  function chain(which) {
    var c = (SRC[which] || []).slice();
    if (!ALLOW_CDN) c = c.filter(function (u) { return u.indexOf('http') !== 0; });
    var b = baked(which);
    return b ? [b].concat(c) : c;
  }

  /* ---- WHY WE DO NOT USE THREE.TextureLoader FOR LOCAL FILES ----------------------------------
     three.js r128 defaults `crossOrigin = 'anonymous'`, so TextureLoader requests every image in
     CORS mode. On a page opened from a file:// URL an <img> with crossOrigin set FAILS TO LOAD AT
     ALL — and even if it loaded, uploading a file:// image into a WebGL texture is a security error
     because each local file is its own opaque origin. The result was that opening the course off
     disk silently lost the photographic Earth and Moon on EVERY module's 3-D globe, fell through the
     whole chain, and left flat coloured spheres. It looked like the maps had been downgraded.

     Setting `loader.crossOrigin = ''` does NOT fix it: in HTML, crossorigin="" means *anonymous*.
     The attribute has to be absent entirely, so we build the Image ourselves for anything that is
     not an http(s) URL, and keep TextureLoader only for the CDN case, which genuinely needs CORS. */
  /* ANISOTROPIC FILTERING. three.js defaults a texture's anisotropy to 1, which is the worst case
     for a planet: at the grazing angles you get from low orbit, one screen pixel covers a long thin
     streak of the map, and with anisotropy 1 the GPU picks a single blurry mip level for it. The
     surface goes soft exactly when you are closest and most want detail — which is why the Moon read
     as "fuzzy" in the lunar module while Earth, viewed from further out, looked fine.
     16 is safe to ask for unconditionally: three.js clamps it to the hardware maximum
     (WebGLTextures uses Math.min(texture.anisotropy, capabilities.getMaxAnisotropy())). */
  function tune(t) {
    t.anisotropy = 16;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter || THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  }

  var loader = new THREE.TextureLoader();          // http(s) only — needs crossOrigin
  function loadLocal(url, onLoad, onErr) {
    var im = new Image();                          // deliberately NO crossOrigin attribute
    im.onload = function () {
      var t = new THREE.Texture(im);
      tune(t);
      t.needsUpdate = true;
      onLoad(t);
    };
    im.onerror = function () { onErr && onErr(); };
    im.src = url;
  }
  function loadOne(url, onLoad, onErr) {
    if (/^https?:/i.test(url)) loader.load(url, function (t) { tune(t); onLoad(t); }, undefined, onErr);
    else loadLocal(url, onLoad, onErr);
  }

  /* load('earth', onLoad[, onFail]) — try each source in turn; onLoad(texture) on the first hit. */
  function load(which, onLoad, onFail) {
    var urls = chain(which);
    (function next(i) {
      if (i >= urls.length) { if (onFail) onFail(); return; }
      loadOne(urls[i], function (t) { onLoad(t, urls[i]); }, function () { next(i + 1); });
    })(0);
  }

  /* onto(material[, fallbackColor]) — the common case: drop the map on a material. */
  function onto(which, material, fallbackColor) {
    load(which, function (t) {
      material.map = t; material.color.set(0xffffff); material.needsUpdate = true;
    }, function () { if (fallbackColor !== undefined) material.color.set(fallbackColor); });
  }

  /* image('earth') — a plain HTMLImageElement, for code that samples raw pixels through a canvas
     (tut8's window raytracer). crossOrigin is set ONLY for an http(s) source, where it is what keeps
     the canvas readable; setting it on a local or data: URL would break the load outright (and a
     data: URL is same-origin anyway, so the canvas stays readable without it). */
  function image(which) {
    var urls = chain(which), i = 0, im = new Image();
    function put(u) {
      if (/^https?:/i.test(u)) im.crossOrigin = 'anonymous';
      else im.removeAttribute('crossorigin');
      im.src = u;
    }
    im.onerror = function () { if (++i < urls.length) put(urls[i]); };
    if (urls.length) put(urls[0]);
    return im;
  }

  window.OA_TEX = { load: load, onto: onto, image: image, chain: chain, allowCdn: ALLOW_CDN };
})();
