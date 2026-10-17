import { describe, it, expect } from "vitest";
import { computeCII } from "./cii";
import type { Vessel } from "../features/api/apiSlice";

function baseVessel(overrides: Partial<Vessel>): Vessel {
  return {
    id: "v1",
    name: "Test Vessel",
    imo_number: "IMO0000001",
    flag_country: "XX",
    type: "CONTAINER",
    status: "AT_SEA",
    latitude: 0,
    longitude: 0,
    heading: 0,
    speed_knots: 0,
    created_at: "2026-01-01T00:00:00Z",
    fuel_level: 0,
    fuel_capacity: 0,
    total_fuel_consumed_tons: 0,
    total_distance_nm: 0,
    ...overrides,
  };
}

describe("computeCII", () => {
  it("rates a high-emissions container ship E (real IMO reference-line formula)", () => {
    const vessel = baseVessel({
      type: "CONTAINER",
      capacity_teu: 1000,
      total_fuel_consumed_tons: 500,
      total_distance_nm: 5000,
    });
    const result = computeCII(vessel);
    expect(result).not.toBeNull();
    expect(result!.rating).toBe("E");
    expect(result!.ratio).toBeCloseTo(1.2922, 3);
  });

  it("rates an efficient tanker A", () => {
    const vessel = baseVessel({
      type: "TANKER",
      capacity_barrels: 500000,
      total_fuel_consumed_tons: 300,
      total_distance_nm: 10000,
    });
    const result = computeCII(vessel);
    expect(result).not.toBeNull();
    expect(result!.rating).toBe("A");
    expect(result!.ratio).toBeCloseTo(0.2322, 3);
  });

  it("returns null when there isn't enough voyage data yet", () => {
    const vessel = baseVessel({
      type: "CONTAINER",
      capacity_teu: 1000,
      total_fuel_consumed_tons: 0,
      total_distance_nm: 0,
    });
    expect(computeCII(vessel)).toBeNull();
  });

  it("returns null for a vessel type with no published reference line", () => {
    const vessel = baseVessel({
      type: "BULK_CARRIER",
      total_fuel_consumed_tons: 500,
      total_distance_nm: 5000,
    });
    expect(computeCII(vessel)).toBeNull();
  });

  it("returns null when the vessel's capacity field for its type is missing", () => {
    const vessel = baseVessel({
      type: "CONTAINER",
      capacity_teu: undefined,
      total_fuel_consumed_tons: 500,
      total_distance_nm: 5000,
    });
    expect(computeCII(vessel)).toBeNull();
  });
});
