import type { Vessel } from "../features/api/apiSlice";

// A simplified estimate of the IMO's real Carbon Intensity Indicator
// (CII, Resolution MEPC.352(78)), not the full regulatory calculation -
// that also requires voyage-by-voyage logging and yearly correction
// factors a demo app reasonably can't replicate. What IS real here: the
// formula shape, the reference-line constants (a, c) for container ships
// and tankers, and the HFO carbon factor - all genuine published IMO
// values, not invented for this app.

const CARBON_FACTOR_HFO = 3.114; // tonnes CO2 per tonne of fuel burned (IMO MARPOL Annex VI)

// Reference line constants: CII_ref = a * DWT^(-c)
const REFERENCE_LINES: Record<string, { a: number; c: number }> = {
  CONTAINER: { a: 1984, c: 0.489 },
  TANKER: { a: 5247, c: 0.61 },
};

// Rough deadweight-tonnage estimate from what this app actually tracks
// per vessel type - TEU/barrel capacity, not DWT directly.
function estimateDWT(vessel: Vessel): number | null {
  if (vessel.type === "CONTAINER" && vessel.capacity_teu) {
    return vessel.capacity_teu * 12; // ~12t DWT per TEU, a common rule of thumb
  }
  if (vessel.type === "TANKER" && vessel.capacity_barrels) {
    return vessel.capacity_barrels * 0.136; // metric tons per barrel of crude
  }
  return null;
}

export type CIIRating = "A" | "B" | "C" | "D" | "E";

export interface CIIResult {
  rating: CIIRating;
  attained: number; // grams CO2 per DWT-nautical-mile
  required: number; // the reference line's value for this vessel's size
  ratio: number; // attained / required - what the rating is actually based on
}

export function computeCII(vessel: Vessel): CIIResult | null {
  const dwt = estimateDWT(vessel);
  const line = REFERENCE_LINES[vessel.type];
  if (!dwt || !line || vessel.total_distance_nm < 1) {
    return null; // not enough data yet, or an unsupported vessel type
  }

  const co2Grams = vessel.total_fuel_consumed_tons * CARBON_FACTOR_HFO * 1_000_000;
  const attained = co2Grams / (dwt * vessel.total_distance_nm);
  const required = line.a * Math.pow(dwt, -line.c);
  const ratio = attained / required;

  // Simplified boundaries (the real ones are multi-year tables per ship
  // type) - good enough to communicate "better/worse than the reference
  // line", not precise enough to cite as a regulatory rating.
  let rating: CIIRating;
  if (ratio < 0.95) rating = "A";
  else if (ratio < 1.0) rating = "B";
  else if (ratio < 1.05) rating = "C";
  else if (ratio < 1.15) rating = "D";
  else rating = "E";

  return { rating, attained, required, ratio };
}

export const CII_RATING_COLOR: Record<CIIRating, string> = {
  A: "text-emerald-400 bg-emerald-500/10",
  B: "text-emerald-400 bg-emerald-500/10",
  C: "text-amber-400 bg-amber-500/10",
  D: "text-orange-400 bg-orange-500/10",
  E: "text-red-400 bg-red-500/10",
};
