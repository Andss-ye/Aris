/* =====================================================================
   Aris — rendering engine
   Owns the renderer, scene, lights, both cameras and the orbit/zoom state.
   Other modules import `scene` / `worldGroup` to add content and the live
   `camera` binding to render. Camera mutation is funneled through the
   exported orbit()/zoom()/togglePerspective() helpers.
   ===================================================================== */

// -------- renderer --------
const container = document.getElementById('app');
const canvasEl = document.createElement('canvas');
export const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.NoToneMapping;
container.appendChild(renderer.domElement);

// -------- scene --------
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4ede0);

// All placed tiles/objects live under this group (raycast target + reset unit).
export const worldGroup = new THREE.Group();
scene.add(worldGroup);

// -------- cameras (orthographic + perspective) --------
let viewSize = 7.5;
let cameraMode = 'ortho'; // 'ortho' | 'perspective'

const aspect0 = window.innerWidth / window.innerHeight;
const orthoCam = new THREE.OrthographicCamera(
  -viewSize * aspect0, viewSize * aspect0,
  viewSize, -viewSize,
  0.1, 200
);
// narrow FOV + far distance gives the "miniature/telephoto" look that sits
// closest to the iso aesthetic while still showing real depth.
const persCam = new THREE.PerspectiveCamera(28, aspect0, 0.1, 200);

// Live binding: reassigned by togglePerspective(); importers see the update.
export let camera = orthoCam;

// orbit state
let azimuth = Math.PI * 0.25;   // around Y
let polar   = Math.PI * 0.32;   // from +Y axis
export const target = new THREE.Vector3(0, 0, 0);

export function updateCamera() {
  // ortho: fixed orbit radius — frustum size controls zoom.
  // perspective: radius scales with viewSize so wheel-zoom stays consistent.
  const r = cameraMode === 'ortho' ? 14 : viewSize * 4.2;
  camera.position.x = target.x + r * Math.sin(polar) * Math.cos(azimuth);
  camera.position.y = target.y + r * Math.cos(polar);
  camera.position.z = target.z + r * Math.sin(polar) * Math.sin(azimuth);
  camera.lookAt(target);
}
updateCamera();

// -------- lighting --------
// Neutral hemisphere — warm sky was dyeing everything cream-yellow.
const hemi = new THREE.HemisphereLight(0xffffff, 0xb39879, 0.30);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(7, 12, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -10;
sun.shadow.camera.right = 10;
sun.shadow.camera.top = 10;
sun.shadow.camera.bottom = -10;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 35;
sun.shadow.bias = -0.0006;
sun.shadow.radius = 3;
scene.add(sun);
// No ambient — hemi handles fill, ambient just compresses contrast & saturation.

// -------- resize --------
export function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  const aspect = w / h;

  orthoCam.left = -viewSize * aspect;
  orthoCam.right = viewSize * aspect;
  orthoCam.top = viewSize;
  orthoCam.bottom = -viewSize;
  orthoCam.updateProjectionMatrix();

  persCam.aspect = aspect;
  persCam.updateProjectionMatrix();

  renderer.setSize(w, h);
  updateCamera();
}
window.addEventListener('resize', onResize);

// -------- camera controls API --------
export function orbit(ddx, ddy) {
  azimuth -= ddx * 0.008;
  polar = Math.max(0.18, Math.min(1.25, polar - ddy * 0.006));
  updateCamera();
}

export function zoom(deltaY) {
  viewSize = Math.max(4, Math.min(14, viewSize + deltaY * 0.005));
  onResize();
}

// Swap projection and return the new mode (so the UI can reflect button state).
export function togglePerspective() {
  cameraMode = cameraMode === 'ortho' ? 'perspective' : 'ortho';
  camera = cameraMode === 'ortho' ? orthoCam : persCam;
  onResize();
  return cameraMode;
}
