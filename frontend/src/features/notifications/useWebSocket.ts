import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { API_BASE_URL } from "../api/apiSlice";
import { fleetSocketUrl } from "../../lib/ws";
import { handleSocketMessage } from "./socketMessages";
import type { AppDispatch } from "../../app/store";

export const useWebSocket = (): void => {
  const dispatch = useDispatch<AppDispatch>();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    // Set on cleanup. Closing the socket below fires onclose, which would
    // otherwise schedule a reconnect - leaving a socket alive after logout
    // (or after leaving the dashboard) that keeps feeding the store with a
    // token that is no longer valid.
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      if (reconnectAttemptsRef.current > 10) {
        console.error("❌ WebSocket: Max reconnection attempts reached");
        return;
      }

      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(
        fleetSocketUrl(API_BASE_URL, localStorage.getItem("token")),
      );

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        if (!disposed) handleSocketMessage(dispatch, event.data);
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket Error:", error);
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (disposed) return;
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [dispatch]);
};
