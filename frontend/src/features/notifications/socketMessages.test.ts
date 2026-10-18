import { describe, it, expect, vi, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { handleSocketMessage } from "./socketMessages";
import notificationsReducer from "./notificationsSlice";
import { apiSlice, type Vessel } from "../api/apiSlice";
import type { AppDispatch } from "../../app/store";

const vessel = (id: string, progress = 0) =>
  ({ id, name: `Vessel ${id}`, route_progress: progress }) as unknown as Vessel;

const makeStore = () =>
  configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      notifications: notificationsReducer,
    },
    middleware: (gdm) => gdm().concat(apiSlice.middleware),
  });

const cachedVessels = (store: ReturnType<typeof makeStore>) =>
  apiSlice.endpoints.getVessels.select()(store.getState() as never).data;

afterEach(() => vi.restoreAllMocks());

describe("handleSocketMessage", () => {
  it("replaces the cached vessel list with a FLEET_UPDATE snapshot - no HTTP request needed", async () => {
    const store = makeStore();
    await store.dispatch(
      apiSlice.util.upsertQueryData("getVessels", undefined, [vessel("1", 0.1)]),
    );
    expect(cachedVessels(store)).toEqual([vessel("1", 0.1)]);

    handleSocketMessage(
      store.dispatch as unknown as AppDispatch,
      JSON.stringify({
        type: "FLEET_UPDATE",
        payload: [vessel("1", 0.2), vessel("2")],
      }),
    );

    expect(cachedVessels(store)).toEqual([vessel("1", 0.2), vessel("2")]);
  });

  it("toasts an ALERT and refreshes the persisted alert list", () => {
    const store = makeStore();
    const dispatch = vi.fn(store.dispatch);
    const alert = {
      level: "CRITICAL",
      message: "out of fuel",
      vessel_id: "1",
      vessel_name: "A",
      timestamp: "t",
    };

    handleSocketMessage(
      dispatch as unknown as AppDispatch,
      JSON.stringify({ type: "ALERT", payload: alert }),
    );

    expect(store.getState().notifications.alerts).toHaveLength(1);
    expect(dispatch).toHaveBeenCalledWith(
      apiSlice.util.invalidateTags(["Alerts"]),
    );
  });

  it("refetches the data sets an INVALIDATE message names", () => {
    const dispatch = vi.fn();
    handleSocketMessage(
      dispatch as unknown as AppDispatch,
      JSON.stringify({
        type: "INVALIDATE",
        payload: { tags: ["Routes", "Shipments"] },
      }),
    );
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledWith(
      apiSlice.util.invalidateTags(["Routes", "Shipments"]),
    );
  });

  it("ignores tags it does not know, and never invalidates Vessels (FLEET_UPDATE covers those)", () => {
    const dispatch = vi.fn();
    handleSocketMessage(
      dispatch as unknown as AppDispatch,
      JSON.stringify({
        type: "INVALIDATE",
        payload: { tags: ["Vessels", "Bogus", "Allocations"] },
      }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      apiSlice.util.invalidateTags(["Allocations"]),
    );

    dispatch.mockClear();
    handleSocketMessage(
      dispatch as unknown as AppDispatch,
      JSON.stringify({
        type: "INVALIDATE",
        payload: { tags: ["Vessels", "Bogus"] },
      }),
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("shrugs off malformed or unexpected messages", () => {
    const dispatch = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const raw of [
      "not json at all",
      JSON.stringify({ type: "SOMETHING_NEW", payload: {} }),
      JSON.stringify({ type: "FLEET_UPDATE", payload: { not: "an array" } }),
      JSON.stringify({ type: "INVALIDATE", payload: null }),
      JSON.stringify({ type: "INVALIDATE", payload: { tags: "Shipments" } }),
      JSON.stringify({}),
    ]) {
      expect(() =>
        handleSocketMessage(dispatch as unknown as AppDispatch, raw),
      ).not.toThrow();
    }
    expect(dispatch).not.toHaveBeenCalled();
  });
});
