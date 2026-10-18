import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import authReducer from "../features/auth/authSlice";
import { Sidebar } from "./Sidebar";
import type { PersistedAlert } from "../features/api/apiSlice";
import * as api from "../features/api/apiSlice";

vi.mock("../features/api/apiSlice", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../features/api/apiSlice")>()),
  useGetAlertsQuery: vi.fn(),
}));

const alert = (id: string, level: PersistedAlert["level"]): PersistedAlert => ({
  id,
  vessel_id: null,
  vessel_name: "X",
  level,
  kind: level === "CRITICAL" ? "OUT_OF_FUEL" : "ARRIVED",
  message: "m",
  created_at: new Date().toISOString(),
  acknowledged_by: null,
  acknowledged_at: null,
  resolved_at: null,
});

const renderSidebar = (alerts: PersistedAlert[] | undefined) => {
  vi.mocked(api.useGetAlertsQuery).mockReturnValue({
    data: alerts,
  } as unknown as ReturnType<typeof api.useGetAlertsQuery>);
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    </Provider>,
  );
};

describe("Sidebar alert badge", () => {
  it("counts open CRITICAL alerts on Overview, ignoring INFO events", () => {
    renderSidebar([alert("1", "CRITICAL"), alert("2", "CRITICAL"), alert("3", "INFO")]);
    expect(screen.getByLabelText("2 open critical alerts")).toHaveTextContent("2");
  });

  it("shows no badge when there is nothing critical (or nothing loaded yet)", () => {
    const { unmount } = renderSidebar([alert("1", "INFO")]);
    expect(screen.queryByLabelText(/open critical alerts/)).not.toBeInTheDocument();
    unmount();
    renderSidebar(undefined);
    expect(screen.queryByLabelText(/open critical alerts/)).not.toBeInTheDocument();
  });
});
