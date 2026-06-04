/* =====================================================================
   Aris — drop-in animation system
   Each tile/object that wants to "land" is pushed into dropAnims with a delay,
   then ticks toward its target Y per frame. While landing, obj.userData.landing
   is set so other position-Y animations (crop bob, smoke origin) yield to it.
   ===================================================================== */

export const dropAnims = [];

export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
export const easeOutBack = t => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export function animateDrop(obj, distance, dur, delay, easing) {
  const baseY = obj.position.y;
  obj.position.y = baseY + distance;
  obj.userData.landing = true;
  dropAnims.push({ obj, baseY, distance, t: -delay, dur, easing });
}

export function tickDropAnims(dt) {
  for (let i = dropAnims.length - 1; i >= 0; i--) {
    const a = dropAnims[i];
    a.t += dt;
    if (a.t < 0) continue;
    const u = Math.min(1, a.t / a.dur);
    a.obj.position.y = a.baseY + a.distance * (1 - a.easing(u));
    if (u >= 1) {
      a.obj.position.y = a.baseY;
      a.obj.userData.landing = false;
      dropAnims.splice(i, 1);
    }
  }
}
