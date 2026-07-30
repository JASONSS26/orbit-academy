#!/usr/bin/env node
/* texture-loading.test.js — the planet maps must load when the course is opened as a FILE.
   Run from the repo root:  node test/texture-loading.test.js

   THE BUG THIS PINS DOWN. three.js r128 defaults `crossOrigin = 'anonymous'`, so THREE.TextureLoader
   requests every image in CORS mode. On a page opened from a file:// URL an <img> with crossOrigin
   set does not load at all, and a file:// image cannot legally be uploaded into a WebGL texture
   either (each local file is its own opaque origin). So an offline/standalone install silently lost
   the photographic Earth and Moon on EVERY module's 3-D globe, fell through the entire source chain,
   and rendered flat coloured spheres. It read as "the images got downgraded".

   Note the trap: `loader.crossOrigin = ''` does NOT fix it, because in HTML crossorigin="" means
   *anonymous*. The attribute must be absent, so local sources are loaded through a hand-built Image
   and TextureLoader is reserved for http(s), which genuinely needs CORS.

   Asserted here by executing the real textures.js against stubs that record exactly what would have
   been requested and whether a crossOrigin attribute would have been set. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let bad = 0;
const ok = (l, c, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + l + (d ? '   [' + d + ']' : '')); if (!c) bad++; };

function boot({ withBaked, failLocal }) {
  const asked = [];                       // every URL a load was attempted for
  const G = {};
  G.window = G;
  G.document = { body: {}, createElement: () => ({ style: {}, appendChild(){}, setAttribute(){} }),
                 addEventListener(){} };
  G.Image = function () {
    const im = { _co: undefined, set src(u) { this._u = u;
                   asked.push({ url: u, crossOrigin: im._co });
                   // simulate: file:// image with crossOrigin set never loads; data: always loads
                   const isData = /^data:/.test(u), isHttp = /^https?:/i.test(u);
                   setTimeout(() => {
                     if (isData) return im.onload && im.onload();
                     if (isHttp) return im.onerror && im.onerror();       // offline
                     if (failLocal) return im.onerror && im.onerror();
                     im.onload && im.onload();
                   }, 0);
                 }, get src() { return this._u; },
                 removeAttribute(n) { if (n === 'crossorigin') im._co = undefined; },
                 set crossOrigin(v) { im._co = v; }, get crossOrigin() { return im._co; } };
    return im;
  };
  G.THREE = {
    TextureLoader: function () {
      return { crossOrigin: 'anonymous',                 // r128 default — the whole problem
               load(u, onLoad, _p, onErr) { asked.push({ url: u, crossOrigin: 'anonymous', viaLoader: true });
                 setTimeout(() => onErr && onErr(new Error('offline')), 0); } };
    },
    Texture: function (im) { this.image = im; this.needsUpdate = false; }
  };
  if (withBaked) {
    const wp = fs.readFileSync(path.join(ROOT, 'public', 'winpix.js'), 'utf8');
    new Function('window', '"use strict";' + wp)(G);
  }
  const tex = fs.readFileSync(path.join(ROOT, 'public', 'textures.js'), 'utf8');
  new Function('window', 'document', 'Image', 'THREE', '"use strict";' + tex)(G, G.document, G.Image, G.THREE);
  return { api: G.OA_TEX, asked };
}

// ---------------------------------------------------------------- with winpix.js present
{
  const { api, asked } = boot({ withBaked: true, failLocal: false });
  ok('OA_TEX initialised', !!api);
  const chain = api.chain('moon');
  ok('the baked data: URL is FIRST in the chain', /^data:image\/jpeg/.test(chain[0]),
     chain[0] ? chain[0].slice(0, 24) : 'empty');
  ok('the vendored file is still a fallback', chain.some(u => /moon_1024\.jpg$/.test(u)));
  ok('no http source while ALLOW_CDN is false', !chain.some(u => /^https?:/i.test(u)));
  ok('allowCdn is false by default', api.allowCdn === false);

  api.image('moon');
  ok('image() requests the baked map', /^data:/.test(asked[0].url), asked[0].url.slice(0, 20));
  ok('image() sets NO crossOrigin on it', asked[0].crossOrigin === undefined,
     'crossOrigin=' + String(asked[0].crossOrigin));
}

// ------------------------------------------- winpix.js absent: local file, still no crossOrigin
{
  const { api, asked } = boot({ withBaked: false, failLocal: false });
  const chain = api.chain('earth');
  ok('without winpix.js the local file leads', /vendor\/textures\/earth_atmos_2048\.jpg$/.test(chain[0]), chain[0]);
  api.image('earth');
  ok('a LOCAL source is requested without crossOrigin (the file:// killer)',
     asked[0].crossOrigin === undefined, 'crossOrigin=' + String(asked[0].crossOrigin));
  ok('and NOT through TextureLoader', !asked[0].viaLoader);
}

// ------------------------------------------- load(): must reach a THREE.Texture offline
{
  const { api } = boot({ withBaked: true, failLocal: true });   // even if every local FILE fails…
  let got = null, failed = false;
  api.load('moon', (t) => { got = t; }, () => { failed = true; });
  setTimeout(() => {
    ok('load() still yields a texture from the baked map when local files fail', !!got && !failed);
    ok('the texture is marked for upload', got && got.needsUpdate === true);
    console.log(bad ? '\n' + bad + ' FAILED' : '\nTEXTURE LOADING VERIFIED — planet maps survive file:// ✓');
    process.exit(bad ? 1 : 0);
  }, 40);
}
