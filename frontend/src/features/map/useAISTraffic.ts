import { useEffect, useRef, useState } from "react";

// Mirrors the JSON shape served by the standalone AIS Ship Tracker project
// (github.com/Oblutack/AISShipTracker) over its /ws endpoint. That project
// decodes real AIS traffic from aisstream.io - these are real ships, not
// part of NeptuneShipments' simulated fleet.
export interface AISVessel {
  mmsi: number;
  name?: string;
  call_sign?: string;
  ship_type?: number;
  type_label?: string;
  flag?: string;
  destination?: string;
  length_m?: number;
  beam_m?: number;
  draught_m?: number;
  latitude: number;
  longitude: number;
  cog: number;
  sog: number;
  heading: number;
  nav_status: number;
  nav_status_label?: string;
  has_position: boolean;
  has_static: boolean;
  last_update: string;
}

interface AISMessage {
  type: "SNAPSHOT" | "POSITION_UPDATE" | "STATIC_UPDATE";
  data: AISVessel | AISVessel[];
}

export type AISConnectionStatus = "idle" | "connecting" | "live" | "error";

const DEFAULT_URL = "ws://localhost:8090/ws";

// An unfiltered global AIS feed pushes hundreds of messages per second.
// Calling setState once per message would trigger a React re-render (and a
// GeoJSON rebuild for the map layer) at that same rate and hang the tab -
// confirmed live: the browser tab became unresponsive within seconds of
// enabling this against a global feed before this buffering was added.
// Incoming messages are written into a plain mutable buffer instead, and
// flushed into React state on a fixed interval - the tracker's own vanilla-
// JS page doesn't need this because a Leaflet marker's setLatLng() is a
// cheap, non-reconciling DOM mutation; a React state update is not.
const FLUSH_INTERVAL_MS = 500;

// Connects to the AIS Ship Tracker's WebSocket only while `enabled` is
// true, so this costs nothing when the layer is toggled off (the default).
// The tracker must be running separately (`go run cmd/server/main.go` in
// the AISShipTracker repo, default port 8090) - this hook does not start
// or manage that process.
export function useAISTraffic(enabled: boolean) {
  const [vessels, setVessels] = useState<Map<number, AISVessel>>(new Map());
  const [status, setStatus] = useState<AISConnectionStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const bufferRef = useRef<Map<number, AISVessel>>(new Map());
  const dirtyRef = useRef(false);

  useEffect(() => {
    // Nothing to connect while disabled - tearing down an existing
    // connection (if the previous render had one) is handled by that
    // prior effect run's own cleanup below, not here.
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    const url = import.meta.env.VITE_AIS_TRACKER_URL || DEFAULT_URL;

    function bufferUpsert(v: AISVessel) {
      // A vessel can exist in the tracker's store from a static/voyage
      // data message alone, before any position report ever arrived - its
      // lat/lon would be (0,0), not a real position. Skip those.
      if (!v.has_position) return;
      bufferRef.current.set(v.mmsi, v);
      dirtyRef.current = true;
    }

    function connect() {
      if (cancelled) return;
      setStatus("connecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setStatus("live");
      ws.onerror = () => setStatus("error");
      ws.onclose = () => {
        if (cancelled) return;
        setStatus("error");
        retryTimer = setTimeout(connect, 3000);
      };
      ws.onmessage = (evt) => {
        let msg: AISMessage;
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }
        if (msg.type === "SNAPSHOT" && Array.isArray(msg.data)) {
          msg.data.forEach(bufferUpsert);
        } else if (!Array.isArray(msg.data)) {
          bufferUpsert(msg.data);
        }
      };
    }
    connect();

    const flush = setInterval(() => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      setVessels(new Map(bufferRef.current));
    }, FLUSH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(flush);
      clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
      bufferRef.current = new Map();
      dirtyRef.current = false;
      setStatus("idle");
      setVessels(new Map());
    };
  }, [enabled]);

  return { vessels: Array.from(vessels.values()), status };
}
