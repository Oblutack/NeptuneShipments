import { describe, it, expect } from "vitest";
import { haversineDistanceKm } from "./geo";

describe("haversineDistanceKm", () => {
  it("returns zero for identical points", () => {
    expect(haversineDistanceKm(51.5, -0.12, 51.5, -0.12)).toBeCloseTo(0, 5);
  });

  it("matches a known real-world distance (London to Paris, ~344km)", () => {
    const d = haversineDistanceKm(51.5074, -0.1278, 48.8566, 2.3522);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(360);
  });

  it("is symmetric regardless of point order", () => {
    const a = haversineDistanceKm(1, 1, 50, 50);
    const b = haversineDistanceKm(50, 50, 1, 1);
    expect(a).toBeCloseTo(b, 10);
  });

  it("one degree of latitude is roughly 111km", () => {
    const d = haversineDistanceKm(0, 0, 1, 0);
    expect(d).toBeCloseTo(111.19, 0);
  });
});
