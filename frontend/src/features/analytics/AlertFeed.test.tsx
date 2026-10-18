import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AlertFeed } from "./AlertFeed";
import type { PersistedAlert, Vessel } from "../api/apiSlice";
import * as api from "../api/apiSlice";

vi.mock("../api/apiSlice", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/apiSlice")>()),
  useGetAlertsQuery: vi.fn(),
  useAcknowledgeAlertMutation: vi.fn(),
}));

const alert = (over: Partial<PersistedAlert>): PersistedAlert => ({
  id: "a1",
  vessel_id: "v1",
  vessel_name: "Ever Given",
  level: "CRITICAL",
  kind: "OUT_OF_FUEL",
  message: "Ever Given has run out of fuel and is stranded at sea!",
  created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  acknowledged_by: null,
  acknowledged_at: null,
  resolved_at: null,
  ...over,
});

const vessel = {
  id: "v1",
  imo_number: "IMO9811000",
  type: "CONTAINER",
  speed_knots: 0,
} as Vessel;

const mockQuery = (value: Partial<ReturnType<typeof api.useGetAlertsQuery>>) =>
  vi.mocked(api.useGetAlertsQuery).mockReturnValue(
    value as unknown as ReturnType<typeof api.useGetAlertsQuery>,
  );

const acknowledge = vi.fn();

beforeEach(() => {
  acknowledge.mockReset();
  vi.mocked(api.useAcknowledgeAlertMutation).mockReturnValue([
    acknowledge,
    { isLoading: false },
  ] as unknown as ReturnType<typeof api.useAcknowledgeAlertMutation>);
});

describe("AlertFeed", () => {
  it("shows the server's alerts, with an ongoing CRITICAL flagged as such", () => {
    mockQuery({
      data: [
        alert({}),
        alert({
          id: "a2",
          level: "INFO",
          kind: "ARRIVED",
          message: "MSC Oscar has successfully arrived at the destination port.",
          vessel_id: null,
          vessel_name: "MSC Oscar",
          created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
          resolved_at: new Date().toISOString(),
        }),
      ],
      isLoading: false,
    });
    render(<AlertFeed vessels={[vessel]} />);

    expect(screen.getByText("2 Active")).toBeInTheDocument();
    expect(screen.getByText(/has run out of fuel/)).toBeInTheDocument();
    expect(screen.getByText("Ongoing")).toBeInTheDocument();
    expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
    expect(screen.getByText(/2 hours ago/)).toBeInTheDocument();
    // vessel details come from the vessels list when the vessel still exists...
    expect(screen.getByText("IMO9811000")).toBeInTheDocument();
    // ...and fall back to the stored name when it doesn't
    expect(screen.getByText("MSC Oscar")).toBeInTheDocument();
  });

  it("labels a CRITICAL whose vessel has since recovered as resolved", () => {
    mockQuery({
      data: [alert({ resolved_at: new Date().toISOString() })],
      isLoading: false,
    });
    render(<AlertFeed vessels={[vessel]} />);
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.queryByText("Ongoing")).not.toBeInTheDocument();
  });

  it("acknowledges the alert it's asked to, offering Dismiss for plain events", () => {
    mockQuery({
      data: [
        alert({}),
        alert({ id: "a2", level: "INFO", kind: "ARRIVED", message: "arrived" }),
      ],
      isLoading: false,
    });
    render(<AlertFeed vessels={[vessel]} />);

    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    expect(acknowledge).toHaveBeenCalledWith("a1");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(acknowledge).toHaveBeenCalledWith("a2");
  });

  it("has no dead 'Request Assistance' button any more", () => {
    mockQuery({ data: [alert({})], isLoading: false });
    render(<AlertFeed vessels={[vessel]} />);
    expect(screen.queryByText("Request Assistance")).not.toBeInTheDocument();
  });

  it("shows an empty state, a loading state and an error state", () => {
    mockQuery({ data: [], isLoading: false });
    const { rerender } = render(<AlertFeed vessels={[]} />);
    expect(screen.getByText("No active alerts")).toBeInTheDocument();
    expect(screen.getByText("0 Active")).toBeInTheDocument();

    mockQuery({ data: undefined, isLoading: true });
    rerender(<AlertFeed vessels={[]} />);
    expect(screen.queryByText("No active alerts")).not.toBeInTheDocument();

    mockQuery({ data: undefined, isLoading: false, isError: true });
    rerender(<AlertFeed vessels={[]} />);
    expect(screen.getByText("Couldn't load alerts")).toBeInTheDocument();
  });
});
