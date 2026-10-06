import { ALPHABET } from '../config/constants.js';
import { createRng } from '../utils/prng.js';

/**
 * Builds a deterministic monoalphabetic substitution cipher map
 * Ensures no letter maps to itself (derangement constraint)
 * @param {number} seed 
 * @returns {Record<string, string>} Mapping from Plaintext Letter -> Ciphertext Letter
 */
export function buildCipherMap(seed) {
  const rng = createRng(seed * 97 + 13);
  let permuted;

  do {
    permuted = ALPHABET.split("");
    for (let i = permuted.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [permuted[i], permuted[j]] = [permuted[j], permuted[i]];
    }
  } while (permuted.some((c, i) => c === ALPHABET[i]));

  const map = {};
  ALPHABET.split("").forEach((c, i) => {
    map[c] = permuted[i];
  });
  return map;
}
