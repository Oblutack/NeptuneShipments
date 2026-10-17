import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { daysUntil } from "./dates";

describe("daysUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-17T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a positive count for a future date", () => {
    expect(daysUntil("2026-10-30")).toBe(13);
  });

  it("returns zero for today", () => {
    expect(daysUntil("2026-10-17")).toBe(0);
  });

  it("returns a negative count for a past (overdue) date", () => {
    expect(daysUntil("2026-10-10")).toBe(-7);
  });
});
