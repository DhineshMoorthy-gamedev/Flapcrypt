/**
 * Deterministic PRNG using 32-bit integer arithmetic
 * @param {number} seed 
 * @returns {() => number} Random float in [0, 1)
 */
export function createRng(seed) {
  return function() {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
