/**
 * Deterministically compute phenotype similarity (cosine) against last-known-good.
 * For Phase 0, returns a fixed deterministic similarity value.
 * 
 * @param {Array<number>} currentPhenotype - Current phenotype vector.
 * @param {Array<number>} lastKnownGoodPhenotype - Last known good phenotype vector.
 * @returns {number} Similarity score between 0 and 1 (fixed for Phase 0).
 */
function comparePhenotypes(currentPhenotype, lastKnownGoodPhenotype) {
  // Phase 0: Return fixed deterministic similarity
  // This can be extended later with actual cosine similarity calculation
  return 0.85;
}

module.exports = { comparePhenotypes };