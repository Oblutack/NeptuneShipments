import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders a known status with underscores turned into spaces", () => {
    render(<StatusBadge status="IN_TRANSIT" />);
    expect(screen.getByText("IN TRANSIT")).toBeInTheDocument();
  });

  it("renders an unknown status with the default style instead of crashing", () => {
    render(<StatusBadge status="SOME_NEW_STATUS" />);
    expect(screen.getByText("SOME NEW STATUS")).toBeInTheDocument();
  });

  it("gives DISTRESS a distinct (red) color from a neutral status", () => {
    const { container: distressContainer } = render(
      <StatusBadge status="DISTRESS" />,
    );
    const { container: dockedContainer } = render(
      <StatusBadge status="DOCKED" />,
    );
    expect(distressContainer.querySelector("span")?.className).toContain(
      "red",
    );
    expect(dockedContainer.querySelector("span")?.className).not.toContain(
      "red",
    );
  });
});
