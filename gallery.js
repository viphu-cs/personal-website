/**
 * gallery.js — 3D Globe Gallery
 * Three.js WebGL: images tile the sphere surface like a globe.
 * Tiles near the poles are naturally compressed/distorted by the sphere geometry.
 *
 * HOW TO ADD IMAGES:
 *   Add entries to GALLERY_IMAGES below.
 *   { src: "images/gallery/photo.jpg", alt: "Description" }
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ─────────────────────────────────────────────
   CONFIGURATION — Edit here
───────────────────────────────────────────── */

const GALLERY_IMAGES = [
  { src: "images/gallery/photo (1).JPG", alt: "Photo 1" },
  { src: "images/gallery/photo (2).jpg", alt: "Photo 2" },
  { src: "images/gallery/photo (3).JPG", alt: "Photo 3" },
  { src: "images/gallery/photo (4).JPG", alt: "Photo 4" },
  { src: "images/gallery/photo (5).JPG", alt: "Photo 5" },
  { src: "images/gallery/photo (6).jpg", alt: "Photo 6" },
  { src: "images/gallery/photo (7).jpg", alt: "Photo 7" },
  { src: "images/gallery/photo (8).jpg", alt: "Photo 8" },
  { src: "images/gallery/photo (9).jpg", alt: "Photo 9" },
  { src: "images/gallery/photo (10).jpg", alt: "Photo 10" },
  { src: "images/gallery/photo (11).jpg", alt: "Photo 11" },
  { src: "images/gallery/photo (12).jpg", alt: "Photo 12" },
  { src: "images/gallery/photo (13).jpg", alt: "Photo 13" },
  { src: "images/gallery/photo (14).jpg", alt: "Photo 14" },
  { src: "images/gallery/photo (15).jpg", alt: "Photo 15" },
  { src: "images/gallery/photo (16).jpg", alt: "Photo 16" },
  { src: "images/gallery/photo (17).jpg", alt: "Photo 17" },
  { src: "images/gallery/photo (18).jpg", alt: "Photo 18" },
  { src: "images/gallery/photo (19).jpg", alt: "Photo 19" },
  { src: "images/gallery/photo (20).jpg", alt: "Photo 20" },
  { src: "images/gallery/photo (21).jpg", alt: "Photo 21" },
  { src: "images/gallery/photo (22).jpg", alt: "Photo 22" },
  { src: "images/gallery/photo (23).jpg", alt: "Photo 23" },
  { src: "images/gallery/photo (24).jpg", alt: "Photo 24" },
  { src: "images/gallery/photo (25).jpg", alt: "Photo 25" },
  { src: "images/gallery/photo (26).jpg", alt: "Photo 26" },
  { src: "images/gallery/photo (27).jpg", alt: "Photo 27" },
  { src: "images/gallery/photo (28).jpg", alt: "Photo 28" },
  { src: "images/gallery/photo (29).jpg", alt: "Photo 29" },
  { src: "images/gallery/photo (30).jpg", alt: "Photo 30" },
  { src: "images/gallery/photo (31).jpg", alt: "Photo 31" },
  { src: "images/gallery/photo (32).jpg", alt: "Photo 32" },
  { src: "images/gallery/photowebp (1).webp", alt: "Photo 33" },
  { src: "images/gallery/photowebp (2).webp", alt: "Photo 34" }
];

const CFG = {
  placeholderCount : 12,   // tiles shown before real images are added
  autoRotateSpeed  : 0.35, // degrees/frame
  autoRotateDelay  : 3000, // ms idle before auto-spin resumes
  tileSize         : 0.45, // size of each flat tile
  colGap           : 0.03, // horizontal gap between tiles
  rowGap           : 0.1,  // vertical gap between rows
  minRadius        : 1.2,  // minimum sphere radius
};

/* Placeholder gradient colours (pink → purple palette) */
const GRAD_PALETTE = [
  ['#6a0572','#d104af'], ['#2d1b69','#7b2ff7'], ['#1a1a2e','#e94560'],
  ['#0f3460','#533483'], ['#53354a','#903749'], ['#2b2d42','#ef233c'],
  ['#180028','#c300ff'], ['#003459','#007ea7'], ['#4a0e4e','#e040fb'],
  ['#1b1b2f','#e43f5a'], ['#0d2137','#4361ee'], ['#380028','#ff4081'],
];

/* ─────────────────────────────────────────────
   GLOBALS
───────────────────────────────────────────── */

let scene, camera, renderer, controls, globe;
let tileMeshes = [];          // { mesh, data }
let autoRotateTimer = null;

/* Drag detection — prevents accidental lightbox on drag */
let dragDist   = 0;
let dragStartX = 0;
let dragStartY = 0;
const DRAG_THRESHOLD = 6; // px — below this = intentional click

/* ─────────────────────────────────────────────
   ADAPTIVE RINGS LAYOUT
   Distributes N items into latitude rings such that
   equator has more items, poles have fewer.
───────────────────────────────────────────── */

function computeAdaptiveRings(n) {
  // Estimate number of rings based on sphere surface area approximation
  // More items -> more rings
  const numRings = Math.max(3, Math.round(Math.sqrt(n)));
  const rings = [];
  let totalAssigned = 0;

  // Calculate raw proportions based on cosine of latitude
  const rawCounts = [];
  let rawTotal = 0;
  for (let i = 0; i < numRings; i++) {
    // latitude from -PI/2 to PI/2
    const lat = -Math.PI / 2 + (i + 0.5) * (Math.PI / numRings);
    const weight = Math.cos(lat);
    rawCounts.push(weight);
    rawTotal += weight;
  }

  // Assign items proportionally
  for (let i = 0; i < numRings; i++) {
    const count = Math.round((rawCounts[i] / rawTotal) * n);
    rings.push(count);
    totalAssigned += count;
  }

  // Adjust for rounding errors to exactly match n
  let diff = n - totalAssigned;
  while (diff !== 0) {
    const sign = Math.sign(diff);
    // Find the ring with the largest weight (closest to equator) to add/subtract
    let targetIdx = Math.floor(numRings / 2);
    let bestScore = -Infinity;
    
    for (let i = 0; i < numRings; i++) {
      if (sign < 0 && rings[i] <= 1) continue; // Don't empty a ring
      
      const lat = -Math.PI / 2 + (i + 0.5) * (Math.PI / numRings);
      // Give preference to equator rings
      const score = Math.cos(lat); 
      
      if (score > bestScore) {
        bestScore = score;
        targetIdx = i;
      }
    }
    
    rings[targetIdx] += sign;
    diff -= sign;
  }

  // Filter out any 0 count rings
  return rings.filter(c => c > 0);
}

/* ─────────────────────────────────────────────
   PLACEHOLDER TEXTURE (canvas → THREE.CanvasTexture)
───────────────────────────────────────────── */

function makePlaceholderTex(c1, c2, label) {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');

  // Gradient fill
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  // Subtle dot grid
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let x = 20; x < S; x += 40)
    for (let y = 20; y < S; y += 40) {
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }

  // Glowing border
  const bg = ctx.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, 'rgba(255,125,233,0.9)');
  bg.addColorStop(1, 'rgba(123,47,247,0.9)');
  ctx.strokeStyle = bg;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, S - 10, S - 10);

  // Label (image number)
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = `bold ${S * 0.22}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, S / 2, S / 2);

  return new THREE.CanvasTexture(cv);
}

/* ─────────────────────────────────────────────
   TEXTURE OPTIMIZATION
   Loads an image, scales it down via Canvas to reduce VRAM usage.
───────────────────────────────────────────── */
function loadOptimizedTexture(url) {
  const canvas = document.createElement('canvas');
  // 512x512 is a good balance between quality and VRAM (reduces size by ~95%)
  const MAX_SIZE = 512; 
  canvas.width = MAX_SIZE;
  canvas.height = MAX_SIZE;
  
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#110011'; // Dark background
  ctx.fillRect(0, 0, MAX_SIZE, MAX_SIZE);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    // Calculate aspect ratio cover
    const ratio = Math.max(MAX_SIZE / img.width, MAX_SIZE / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    const x = (MAX_SIZE - w) / 2;
    const y = (MAX_SIZE - h) / 2;
    
    ctx.drawImage(img, x, y, w, h);
    texture.needsUpdate = true;
  };
  img.src = url;
  
  return texture;
}

/* ─────────────────────────────────────────────
   BUILD GLOBE
   Creates PlaneGeometry tiles, distributed via Adaptive Rings.
───────────────────────────────────────────── */

function buildGlobe(images) {
  // Remove old globe if rebuilding and cleanup memory (prevent memory leaks)
  if (globe) { 
    globe.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
    scene.remove(globe); 
    globe = null; 
    tileMeshes = []; 
  }

  const rings = computeAdaptiveRings(images.length);
  
  // --- DYNAMIC RADIUS CALCULATION ---
  const equatorCount = Math.max(...rings, 1);
  const circumference = equatorCount * (CFG.tileSize + CFG.colGap);
  let R = Math.max(CFG.minRadius, circumference / (2 * Math.PI));

  // Check if we need to increase R to fit all rows vertically
  const rowArc = CFG.tileSize + CFG.rowGap;
  const numRings = rings.length;
  const totalArc = (numRings - 1) * rowArc;
  
  if (totalArc > Math.PI * R) {
    R = totalArc / Math.PI; // Adjust R so rows don't overlap poles
  }
  
  globe = new THREE.Group();
  let imgIndex = 0;

  const geo = new THREE.PlaneGeometry(CFG.tileSize, CFG.tileSize);

  rings.forEach((count, ringIdx) => {
    // latitude for this ring (spread rows evenly by rowArc)
    const lat = numRings > 1 
      ? (totalArc / 2 - ringIdx * rowArc) / R 
      : 0;

    for (let i = 0; i < count; i++) {
      if (imgIndex >= images.length) break;
      const img = images[imgIndex++];

      // longitude for this item
      const lon = (i / count) * Math.PI * 2;

      // Position on sphere
      const x = R * Math.cos(lat) * Math.cos(lon);
      const y = R * Math.sin(lat);
      const z = R * Math.cos(lat) * Math.sin(lon);

      // Texture
      let tex;
      if (img.placeholder) {
        tex = makePlaceholderTex(img.colors[0], img.colors[1], String(imgIndex));
      } else {
        tex = loadOptimizedTexture(img.src);
      }

      // Use Lambert instead of Standard to save GPU compute power
      const mat = new THREE.MeshLambertMaterial({
        map       : tex,
        side      : THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geo, mat);
      
      // Position and orientation
      mesh.position.set(x, y, z);
      // Look away from center
      const center = new THREE.Vector3(0, 0, 0);
      mesh.lookAt(center);
      mesh.rotateY(Math.PI); // flip to face outward

      globe.add(mesh);
      tileMeshes.push({ mesh, data: img });
    }
  });

  scene.add(globe);
  return R; // return dynamic radius for camera positioning
}

/* ─────────────────────────────────────────────
   GLOW SHELLS (subtle rim around sphere)
───────────────────────────────────────────── */

function addGlow(radius) {
  [[radius + 0.04, 0xff7de9, 0.09],
   [radius + 0.18, 0xd104af, 0.04]].forEach(([r, col, op]) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 32),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op,
                                    side: THREE.BackSide, depthWrite: false })
    );
    scene.add(m);
  });
}

/* ─────────────────────────────────────────────
   SCENE INIT
───────────────────────────────────────────── */

function init() {
  const canvas = document.getElementById('gallery-canvas');
  if (!canvas) return;

  /* Scene */
  scene = new THREE.Scene();

  /* Camera */
  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  // camera position.z is set later based on dynamic radius

  /* Renderer */
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0); // transparent → body bg shows through

  /* Lights */
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const key = new THREE.DirectionalLight(0xfff0ff, 1.1);
  key.position.set(4, 4, 5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x7b2ff7, 0.5);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  /* OrbitControls */
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping    = true;
  controls.dampingFactor    = 0.06;
  controls.autoRotate       = true;
  controls.autoRotateSpeed  = CFG.autoRotateSpeed;
  controls.enablePan        = false;
  // minDistance and maxDistance set later based on dynamic radius

  // Pause auto-rotate when user interacts, resume after idle
  controls.addEventListener('start', pauseAutoRotate);
  controls.addEventListener('end',   scheduleAutoRotate);

  /* Build content */
  const images = GALLERY_IMAGES.length > 0
    ? GALLERY_IMAGES
    : Array.from({ length: CFG.placeholderCount }, (_, i) => ({
        placeholder : true,
        colors      : GRAD_PALETTE[i % GRAD_PALETTE.length],
        alt         : `Photo ${i + 1}`,
      }));

  const dynamicRadius = buildGlobe(images);
  addGlow(dynamicRadius);

  /* Adjust camera and controls based on radius */
  camera.position.z = dynamicRadius * 2.8;
  controls.minDistance = dynamicRadius * 1.5;
  controls.maxDistance = dynamicRadius * 6;

  /* Drag-distance tracking — reset on pointerdown, accumulate on pointermove */
  renderer.domElement.addEventListener('pointerdown', (e) => {
    dragDist   = 0;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    dragDist = Math.sqrt(dx * dx + dy * dy);
  });

  /* Raycaster for click-to-lightbox */
  const raycaster = new THREE.Raycaster();
  const pointer   = new THREE.Vector2();

  renderer.domElement.addEventListener('click', (e) => {
    // Suppress click if user was dragging
    if (dragDist > DRAG_THRESHOLD) return;

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(tileMeshes.map(t => t.mesh));
    if (hits.length > 0) {
      const tile = tileMeshes.find(t => t.mesh === hits[0].object);
      if (tile && !tile.data.placeholder) openLightbox(tile.data.src, tile.data.alt);
    }
  });

  /* Lightbox close handlers */
  document.getElementById('lightbox-overlay')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('lightbox-overlay') ||
        e.target.classList.contains('lightbox-close')) closeLightbox();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

  /* Resize */
  window.addEventListener('resize', () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  /* Start render loop */
  const cameraPos = new THREE.Vector3();
  const tilePos = new THREE.Vector3();

  (function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Backface culling: hide tiles facing away from camera to save draw calls
    cameraPos.copy(camera.position).normalize();
    tileMeshes.forEach(({ mesh }) => {
      tilePos.copy(mesh.position).normalize();
      // If dot product > -0.2, it's on the front hemisphere (with some margin)
      mesh.visible = tilePos.dot(cameraPos) > -0.2;
    });

    renderer.render(scene, camera);
  })();
}

/* ─────────────────────────────────────────────
   AUTO-ROTATE HELPERS
───────────────────────────────────────────── */

function pauseAutoRotate() {
  clearTimeout(autoRotateTimer);
  controls.autoRotate = false;
}

function scheduleAutoRotate() {
  clearTimeout(autoRotateTimer);
  autoRotateTimer = setTimeout(() => { controls.autoRotate = true; }, CFG.autoRotateDelay);
}

/* ─────────────────────────────────────────────
   LIGHTBOX
───────────────────────────────────────────── */

function openLightbox(src, alt) {
  const overlay = document.getElementById('lightbox-overlay');
  const img     = document.getElementById('lightbox-img');
  if (!overlay || !img) return;
  img.src = src; img.alt = alt || '';
  overlay.classList.add('active');
}

function closeLightbox() {
  document.getElementById('lightbox-overlay')?.classList.remove('active');
}

/* ─────────────────────────────────────────────
   BOOT
───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', init);
