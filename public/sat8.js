/* sat8.js — a physically-lit 3-D GEO satellite for the cockpit window (Module 8).
   Builds a simple satellite from primitives (box bus + two solar-panel wings + a dish) and lights it
   with a DIRECTIONAL light from the true Sun direction, so its illuminated phase, self-shadowing, and
   eclipse darkness are all correct as you approach from any angle — the accurate way to show a
   satellite's "phase" (a flat photo can't self-shadow). Renders into an offscreen canvas with a
   transparent background that the window scene composites on top of the space view.

   Optional textures: drop images in public/ and set SAT7_TEX = {panel:'...', bus:'...'} before load,
   or call Sat7.setTextures({panel, bus}); primitives use tasteful defaults (gold foil, blue cells)
   until then. Requires THREE (already loaded by tut7). Guarded if THREE is missing. */
(function(g){
"use strict";
let renderer=null, scene=null, cam=null, sat=null, sun=null, ambient=null, ok=false, size=256;
const tex={panel:null, bus:null};

function build(px){
  if(g.__noThree || typeof THREE==='undefined') return false;
  size=px||256;
  const cv=document.createElement('canvas'); cv.width=cv.height=size;
  renderer=new THREE.WebGLRenderer({canvas:cv, alpha:true, antialias:true});
  renderer.setClearColor(0x000000,0);
  scene=new THREE.Scene();
  cam=new THREE.PerspectiveCamera(30,1,0.1,100); cam.position.set(0,0,8);
  sun=new THREE.DirectionalLight(0xffffff,2.4); scene.add(sun);
  ambient=new THREE.AmbientLight(0x223044,0.35); scene.add(ambient);   // faint fill so the dark side isn't pure black
  sat=new THREE.Group();
  // --- bus (gold-foil box) ---
  const busMat=new THREE.MeshStandardMaterial({color:0xcaa64a, metalness:0.6, roughness:0.5});
  const bus=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.3,1.1), busMat); sat.add(bus);
  // --- solar-panel wings (two flat blue slabs on a boom) ---
  const panelMat=new THREE.MeshStandardMaterial({color:0x1b3a6b, metalness:0.3, roughness:0.4, emissive:0x0a1830, emissiveIntensity:0.25});
  for(const s of [-1,1]){
    const boom=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.1,8), new THREE.MeshStandardMaterial({color:0x888888,metalness:0.7,roughness:0.4}));
    boom.rotation.z=Math.PI/2; boom.position.x=s*1.1; sat.add(boom);
    const wing=new THREE.Mesh(new THREE.BoxGeometry(2.3,0.04,1.15), panelMat);
    wing.position.x=s*2.75; sat.add(wing);
    // panel cell grid lines (thin dark strips) for texture-less readability
    const grid=new THREE.Mesh(new THREE.BoxGeometry(2.32,0.05,0.03), new THREE.MeshStandardMaterial({color:0x0a1428}));
    for(let k=-2;k<=2;k++){ const gm=grid.clone(); gm.position.set(s*2.75,0,k*0.28); sat.add(gm); }
  }
  // --- comms dish ---
  const dishMat=new THREE.MeshStandardMaterial({color:0xdddddd, metalness:0.2, roughness:0.7, side:THREE.DoubleSide});
  const dish=new THREE.Mesh(new THREE.SphereGeometry(0.5,20,12,0,6.283,0,1.0), dishMat);
  dish.position.set(0,0.9,0.2); dish.rotation.x=-0.5; sat.add(dish);
  scene.add(sat);
  applyTextures();
  ok=true; return true;
}
function applyTextures(){ if(!ok&&!sat) return;
  const tl=new THREE.TextureLoader();
  if(tex.panel){ tl.load(tex.panel,t=>{ sat.traverse(o=>{ if(o.material&&o.material.color&&o.material.color.getHex()===0x1b3a6b){ o.material.map=t; o.material.needsUpdate=true; } }); },undefined,()=>{}); }
  if(tex.bus){ tl.load(tex.bus,t=>{ sat.traverse(o=>{ if(o.material&&o.material.color&&o.material.color.getHex()===0xcaa64a){ o.material.map=t; o.material.needsUpdate=true; } }); },undefined,()=>{}); }
}
function setTextures(t){ if(t&&t.panel) tex.panel=t.panel; if(t&&t.bus) tex.bus=t.bus; if(ok) applyTextures(); }

/* Render the satellite as seen from the spacecraft. Inputs:
     sunAngle : Sun direction in the scene plane (radians) — sets the phase.
     viewAng  : bearing from which we see the sat (radians) — rotates the sat so approach geometry reads.
     eclipsed : if true, the sat is in shadow → render nearly black (only ambient).
   Returns the offscreen canvas (or null if THREE unavailable). */
function render(sunAngle, viewAng, eclipsed){
  if(!ok) return null;
  sun.position.set(Math.cos(sunAngle||0)*10, 4, Math.sin(sunAngle||0)*10);
  sun.intensity = eclipsed? 0.0 : 2.4;
  ambient.intensity = eclipsed? 0.06 : 0.35;
  sat.rotation.y = (viewAng||0);
  sat.rotation.x = 0.25;
  renderer.render(scene,cam);
  return renderer.domElement;
}
g.Sat7={ build, render, setTextures, get ready(){return ok;} };
})(typeof window!=='undefined'?window:globalThis);
