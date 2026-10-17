import { describe, it, expect } from "vitest";
import { IMDG_CLASSES, imdgLabel } from "./imdg";

describe("imdgLabel", () => {
  it("labels a known class with its real IMDG name", () => {
    expect(imdgLabel("8")).toBe("Class 8 - Corrosive Substances");
  });

  it("covers all 9 real IMDG classes", () => {
    expect(Object.keys(IMDG_CLASSES)).toHaveLength(9);
    for (let i = 1; i <= 9; i++) {
      expect(IMDG_CLASSES[String(i)]).toBeTruthy();
    }
  });

  it("falls back to a generic label for an unknown class", () => {
    expect(imdgLabel("99")).toBe("Class 99 - Dangerous Goods");
  });
});
