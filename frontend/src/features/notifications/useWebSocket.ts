import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { addAlert } from "./notificationsSlice";
import { apiSlice } from "../api/apiSlice";

interface AlertPayload {
  level: "CRITICAL" | "INFO";
  message: string;
  vessel_id: string;
  vessel_name: string;
  timestamp: string;
}

interface WebSocketMessage {
  type: "ALERT" | "FLEET_UPDATE";
  payload: AlertPayload | unknown;
}

export const useWebSocket = (): void => {
  const dispatch = useDispatch();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    const connect = () => {
      if (reconnectAttemptsRef.current > 10) {
        console.error("❌ WebSocket: Max reconnection attempts reached");
        return;
      }

      if (wsRef.current) {
        wsRef.current.close();
      }

      // The browser's native WebSocket API can't set an Authorization
      // header, so the token goes as a query param - the backend's
      // /ws/fleet middleware looks for it there specifically.
      const token = localStorage.getItem("token");
      const ws = new WebSocket(
        `ws://localhost:8080/ws/fleet?token=${encodeURIComponent(token ?? "")}`,
      );

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === "ALERT") {
            dispatch(addAlert(message.payload as AlertPayload));
            dispatch(apiSlice.util.invalidateTags(["Alerts"]));
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket Error:", error);
      };

      ws.onclose = () => {
        wsRef.current = null;
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
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
