import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { useWebSocket } from "./useWebSocket";
import { apiSlice } from "../api/apiSlice";
import notificationsReducer from "./notificationsSlice";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;
  url: string;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  close() {
    this.closed = true;
    this.onclose?.(); // a real socket fires this after close()
  }
}

const Probe = () => {
  useWebSocket();
  return null;
};

const renderProbe = () => {
  const store = configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      notifications: notificationsReducer,
    },
    middleware: (gdm) => gdm().concat(apiSlice.middleware),
  });
  return {
    store,
    ...render(
      <Provider store={store}>
        <Probe />
      </Provider>,
    ),
  };
};

const alertMessage = (message: string) =>
  JSON.stringify({
    type: "ALERT",
    payload: {
      level: "INFO",
      message,
      vessel_id: "1",
      vessel_name: "A",
      timestamp: "t",
    },
  });

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
  vi.useFakeTimers();
  localStorage.setItem("token", "my-token");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("useWebSocket", () => {
  it("connects to the API's own host with the stored token", () => {
    renderProbe();
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe(
      "ws://localhost:8080/ws/fleet?token=my-token",
    );
  });

  it("feeds incoming messages into the store", () => {
    const { store } = renderProbe();
    act(() => {
      FakeWebSocket.instances[0].onmessage?.({ data: alertMessage("hi") });
    });
    expect(store.getState().notifications.alerts).toHaveLength(1);
  });

  it("reconnects after the server drops the connection", () => {
    renderProbe();
    act(() => FakeWebSocket.instances[0].onclose?.());
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  // Closing the socket on unmount fires onclose, which used to schedule a
  // reconnect - leaving a live socket after logout, still feeding the store
  // with a token that was no longer valid.
  it("does not reconnect once the component using it has unmounted", () => {
    const { unmount } = renderProbe();
    unmount();
    expect(FakeWebSocket.instances[0].closed).toBe(true);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("ignores messages that arrive after it has unmounted", () => {
    const { store, unmount } = renderProbe();
    const socket = FakeWebSocket.instances[0];
    unmount();
    act(() => {
      socket.onmessage?.({ data: alertMessage("late") });
    });
    expect(store.getState().notifications.alerts).toHaveLength(0);
  });
});
