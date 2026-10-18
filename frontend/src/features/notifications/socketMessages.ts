import { addAlert, type Alert } from "./notificationsSlice";
import { apiSlice, type Vessel } from "../api/apiSlice";
import type { AppDispatch } from "../../app/store";

type AlertPayload = Omit<Alert, "id" | "read">;

// Data sets the server may tell us to refetch. "Vessels" is deliberately
// absent: vessel updates arrive as FLEET_UPDATE snapshots, and invalidating
// the tag would make every tick refetch finance, scheduling and more.
const INVALIDATABLE_TAGS = [
  "Shipments",
  "Routes",
  "Allocations",
  "Ports",
  "Crew",
  "Alerts",
] as const;
type InvalidatableTag = (typeof INVALIDATABLE_TAGS)[number];

const isInvalidatable = (t: unknown): t is InvalidatableTag =>
  (INVALIDATABLE_TAGS as readonly unknown[]).includes(t);

// Applies one message from /ws/fleet to the client's state:
//   ALERT        a new alert: toast it and refresh the persisted alert list
//   FLEET_UPDATE every vessel's current state: replaces the cached vessel
//                list directly, so no HTTP request is needed
//   INVALIDATE   data sets that changed server-side: refetch them
export function handleSocketMessage(dispatch: AppDispatch, raw: string): void {
  let message: { type?: string; payload?: unknown };
  try {
    message = JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse WebSocket message:", error);
    return;
  }

  switch (message.type) {
    case "ALERT":
      dispatch(addAlert(message.payload as AlertPayload));
      dispatch(apiSlice.util.invalidateTags(["Alerts"]));
      break;

    case "FLEET_UPDATE":
      if (Array.isArray(message.payload)) {
        const vessels = message.payload as Vessel[];
        dispatch(
          apiSlice.util.updateQueryData("getVessels", undefined, () => vessels),
        );
      }
      break;

    case "INVALIDATE": {
      const tags = (message.payload as { tags?: unknown } | null)?.tags;
      if (Array.isArray(tags)) {
        const known = tags.filter(isInvalidatable);
        if (known.length > 0) {
          dispatch(apiSlice.util.invalidateTags(known));
        }
      }
      break;
    }
  }
}
