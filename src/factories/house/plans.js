/* =====================================================================
   Aris — house plans
   A "plan" is an array of per-cell descriptors the assembler turns into
   geometry. Adding a new house silhouette = add a plan + (optionally) a
   detector in cluster.js; the assembler path is shared.
   ===================================================================== */

// A linear (1xN) plan: south-end cell uses the gable-end door, the rest use side
// doors on the +x face, chimneys alternate forward/back per cell for visual
// rhythm. For length 1 the chimney offset matches the original solo cottage.
export function linearHousePlan(length) {
  const cells = [];
  for (let i = 0; i < length; i++) {
    const isSouthEnd = (i === length - 1);
    const chimneyOffset = (length === 1) ? -0.05 : (i % 2 === 0 ? -0.15 : 0.15);
    cells.push({ face: isSouthEnd ? 'gable' : 'side', chimneyOffset });
  }
  return cells;
}
