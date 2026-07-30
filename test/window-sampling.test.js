#!/usr/bin/env node
/* window-sampling.test.js — planet surfaces must not look soft or blocky.
   Run from the repo root:  node test/window-sampling.test.js

   Two independent defects made the Moon read as "fuzzy" in the lunar module while Earth looked fine.
   Neither was about source resolution, and both are worth pinning:

   1. THE WINDOW SAMPLER WAS NEAREST-NEIGHBOUR. `(u*pix.w)|0` snaps each screen pixel to a single map
      texel, so a magnified body — which is exactly what low lunar orbit gives you — showed hard
      blocks that crawled as the ground rolled past. Now bilinear, wrapping in longitude (periodic)
      and clamping in latitude (the poles).

   2. THE 3-D GLOBES HAD ANISOTROPY 1, the three.js default and the worst case for a planet. At the
      grazing angles of low orbit a screen pixel covers a long thin streak of the map, and with
      anisotropy 1 the GPU resolves it with one blurry mip level. Asking for 16 is safe
      unconditionally: three.js clamps to the hardware maximum.

   Earth escaped both because it is normally viewed from much further out, where a texel is smaller
   than a pixel and neither defect shows. Note that the Moon's source map is genuinely only 1024x512
   against Earth's 2048x1024 — these fixes remove the artefacts, they cannot add detail that was
   never photographed. */
const fs=require('fs');
const P=require('path').resolve(__dirname,'..','public');
const src=fs.readFileSync(P+'/tut8.html','utf8');
let bad=0; const ok=(l,c,d)=>{console.log((c?'  PASS  ':'  FAIL  ')+l+(d?'   ['+d+']':''));if(!c)bad++;};
ok('sampler is bilinear, not nearest', /w00=\(1-tx\)\*\(1-ty\)/.test(src) && !/sx=Math\.min\(pix\.w-1,\(u\*pix\.w\)\|0\)/.test(src));
ok('longitude wraps',  /x1w=\(\(x0\+1\)%pix\.w\+pix\.w\)%pix\.w/.test(src));
ok('latitude clamps at the poles', /y1c=\(y0\+1\)<0\?0:/.test(src));

// replicate it: a 2x1 map, black|white. Sampling across the seam must produce a ramp, not two blocks.
const pix={w:4,h:2,data:new Uint8ClampedArray(4*2*4)};
for(let y=0;y<2;y++)for(let x=0;x<4;x++){const v=(x<2)?0:255,i=(y*4+x)*4;pix.data[i]=pix.data[i+1]=pix.data[i+2]=v;pix.data[i+3]=255;}
function sample(u,v){
  const fx=u*pix.w-0.5, fy=v*pix.h-0.5;
  const x0=Math.floor(fx), y0=Math.floor(fy), tx=fx-x0, ty=fy-y0;
  const x0w=((x0%pix.w)+pix.w)%pix.w, x1w=((x0+1)%pix.w+pix.w)%pix.w;
  const y0c=y0<0?0:(y0>pix.h-1?pix.h-1:y0), y1c=(y0+1)<0?0:((y0+1)>pix.h-1?pix.h-1:(y0+1));
  const D=pix.data;
  const i00=(y0c*pix.w+x0w)*4,i10=(y0c*pix.w+x1w)*4,i01=(y1c*pix.w+x0w)*4,i11=(y1c*pix.w+x1w)*4;
  const w00=(1-tx)*(1-ty),w10=tx*(1-ty),w01=(1-tx)*ty,w11=tx*ty;
  return D[i00]*w00+D[i10]*w10+D[i01]*w01+D[i11]*w11;
}
/* Sample straight across the black|white boundary. Nearest-neighbour can only ever return 0 or 255;
   bilinear must produce intermediate values. (Samples that both land inside the black region are
   correctly equal — that is not a failure, which is what my first version of this test got wrong.) */
const ramp=[0.375,0.44,0.50,0.56,0.625].map(u=>Math.round(sample(u,0.5)));
const mid=ramp.filter(v=>v>0&&v<255);
ok('interpolates across a hard edge (nearest could not)', mid.length>=2, ramp.join(' -> '));
ok('the ramp is monotonic', ramp.every((v,i)=>i===0||v>=ramp[i-1]), ramp.join(' -> '));
ok('exact texel centres stay exact', Math.round(sample(0.125,0.25))===0 && Math.round(sample(0.875,0.25))===255);
ok('no NaN at the wrap seam', Number.isFinite(sample(0.999,0.5)) && Number.isFinite(sample(0.001,0.5)));
ok('no NaN at the poles', Number.isFinite(sample(0.5,0.0)) && Number.isFinite(sample(0.5,1.0)));

const tx=fs.readFileSync(P+'/textures.js','utf8');
ok('globe textures request anisotropic filtering', /t\.anisotropy = 16/.test(tx));
ok('mipmaps + linear mag on globes', /generateMipmaps = true/.test(tx) && /magFilter = THREE\.LinearFilter/.test(tx));
console.log(bad?'\n'+bad+' FAILED':'\nSAMPLING + FILTERING VERIFIED');
process.exit(bad?1:0);
