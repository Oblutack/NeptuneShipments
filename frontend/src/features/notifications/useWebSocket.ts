import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { addAlert } from "./notificationsSlice";

interface AlertPayload {
  level: "CRITICAL" | "INFO";
  message: string;
  vessel_id: string;
  vessel_name: string;
  timestamp: string;
}

interface WebSocketMessage {
  type: "ALERT" | "FLEET_UPDATE";
  payload: AlertPayload | unknown; // ✅ Use 'unknown' instead of 'any'
}

export const useWebSocket = (): void => {
  const dispatch = useDispatch();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null); // ✅ Use 'number' type

  useEffect(() => {
    const connect = () => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      console.log("🔌 Connecting to WebSocket...");
      const ws = new WebSocket("ws://127.0.0.1:8080/ws/fleet");

      ws.onopen = () => {
        console.log("✅ WebSocket Connected");
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === "ALERT") {
            console.log("🔔 Alert Received:", message.payload);
            dispatch(addAlert(message.payload as AlertPayload));
          } else if (message.type === "FLEET_UPDATE") {
            console.log("🚢 Fleet Update Received");
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket Error:", error);
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket Disconnected. Reconnecting in 3s...");
        wsRef.current = null;

        reconnectTimeoutRef.current = window.setTimeout(() => {
          // ✅ Use window.setTimeout
          connect();
        }, 3000);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current); // ✅ Use window.clearTimeout
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [dispatch]);
};
