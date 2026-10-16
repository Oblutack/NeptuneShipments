import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  useGetRouteByIdQuery,
  useGetNetworkMeshQuery,
  useGetActiveRoutesQuery,
  type Vessel,
  type Port,
} from "../api/apiSlice";
import { Ship, Anchor, Network, Radio, Waves } from "lucide-react";
import { useMemo, useState } from "react";
import { PortInspector } from "./PortInspector";
import { useAISTraffic, type AISVessel } from "./useAISTraffic";
import { useMarineWeather } from "./useMarineWeather";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { haversineDistanceKm, AIS_PORT_PROXIMITY_KM } from "../../lib/geo";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Minimal shape actually consumed from the Map component's onClick event -
// avoids depending on react-map-gl/mapbox-gl's exact exported event type
// name, which varies across versions and re-export paths.
interface MapClickFeaturesEvent {
  features?: Array<{
    layer?: { id?: string };
    properties?: Record<string, unknown> | null;
  }>;
}

// Generates a consistent color from a string ID
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
};

interface GlobalMapProps {
  vessels: Vessel[] | undefined;
  ports: Port[] | undefined;
  onShipClick?: (id: string | null) => void;
  selectedVesselId?: string | null;
}

export const GlobalMap = ({
  vessels,
  ports,
  onShipClick,
  selectedVesselId,
}: GlobalMapProps) => {
  // 1. Force find the ship
  const activeShip = vessels?.find((v) => v.id === selectedVesselId);

  const [showAllRoutes, setShowAllRoutes] = useState(false);

  const { data: allRoutesData } = useGetActiveRoutesQuery(undefined, {
    skip: !showAllRoutes,
  });

  // 2. LOG THE FINDING (Check Console!)
  console.log("GlobalMap Selected ID:", selectedVesselId);
  console.log("Found Ship:", activeShip?.name);
  console.log("Route ID on Ship:", activeShip?.current_route_id);

  const activeRouteId = activeShip?.current_route_id;

  // Real current sea-state (wave height, swell, period) from Open-Meteo
  // Marine, per port - off by default like the other optional layers, so
  // it costs nothing until toggled on.
  const [showSeaState, setShowSeaState] = useState(false);
  const { weatherByPort, status: seaStateStatus } = useMarineWeather(
    ports,
    showSeaState,
  );
  const [showNetwork, setShowNetwork] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "TANKER" | "CONTAINER">(
    "ALL",
  );

  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
  const selectedPort = ports?.find((p) => p.id === selectedPortId);
  const [hideDocked, setHideDocked] = useState(false);
  const [clickedShipId, setClickedShipId] = useState<string | null>(null);
  const clickedShip = vessels?.find((v) => v.id === clickedShipId);

  // REAL AIS traffic overlay - off by default (thousands of real ships is
  // a lot to render alongside the simulated fleet unless asked for).
  // Connects to the standalone AIS Ship Tracker project, not this app's
  // own backend - see useAISTraffic.ts.
  const [showAISTraffic, setShowAISTraffic] = useState(false);
  const { vessels: aisVessels, status: aisStatus } =
    useAISTraffic(showAISTraffic);
  const [clickedAISVessel, setClickedAISVessel] = useState<AISVessel | null>(
    null,
  );

  // Real ship count near the selected port, from real AIS positions - only
  // computed while the AIS layer is actually on, since otherwise there's no
  // real data to show (not "0", which would look like a real observation).
  const realShipsNearSelectedPort = useMemo(() => {
    if (!showAISTraffic || !selectedPort) return null;
    return aisVessels.filter(
      (v) =>
        haversineDistanceKm(
          v.latitude,
          v.longitude,
          selectedPort.latitude,
          selectedPort.longitude,
        ) <= AIS_PORT_PROXIMITY_KM,
    ).length;
  }, [showAISTraffic, selectedPort, aisVessels]);

  const aisGeoJSON = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: aisVessels.map((v) => ({
        type: "Feature",
        properties: { mmsi: v.mmsi },
        geometry: {
          type: "Point",
          coordinates: [v.longitude, v.latitude],
        },
      })),
    }),
    [aisVessels],
  );

  // Queries
  const { data: networkData } = useGetNetworkMeshQuery(undefined, {
    skip: !showNetwork,
  });
  const { data: routeData } = useGetRouteByIdQuery(activeRouteId || "", {
    skip: !activeRouteId,
  });

  console.log("--- MAP DEBUG ---");
  console.log("1. Selected Vessel ID (Prop):", selectedVesselId);
  console.log("2. Active Ship Name:", activeShip?.name);
  console.log("3. Route ID on Ship:", activeRouteId);
  console.log("4. Fetched Route Data:", routeData);

  // Filtering
  const filteredVessels = vessels?.filter((ship) => {
    if (hideDocked && ship.status === "DOCKED") return false;
    if (filterType !== "ALL" && ship.type !== filterType) return false;
    return true;
  });

  return (
    <div className="w-full rounded-lg overflow-hidden border border-slate-800 relative bg-slate-950 h-[600px]">
      <Map
        mapLib={mapboxgl}
        initialViewState={{
          longitude: 20.0,
          latitude: 35.0,
          zoom: 2.5,
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={TOKEN}
        projection={{ name: "globe" }}
        fog={{
          color: "rgb(20, 30, 40)",
          "high-color": "rgb(200, 200, 250)",
          "horizon-blend": 0.2,
        }}
        interactiveLayerIds={showAISTraffic ? ["ais-traffic-circles"] : []}
        onClick={(e: MapClickFeaturesEvent) => {
          const hit = e.features?.find(
            (f) => f.layer?.id === "ais-traffic-circles",
          );
          if (hit) {
            const mmsi = hit.properties?.mmsi as number;
            setClickedAISVessel(
              aisVessels.find((v) => v.mmsi === mmsi) ?? null,
            );
            return;
          }
          // Optional: Click empty space to deselect
          // if (onShipClick) onShipClick(null);
        }}
      >
        <NavigationControl position="top-right" />

        {/* REAL AIS TRAFFIC (from the standalone AIS Ship Tracker) */}
        {showAISTraffic && aisVessels.length > 0 && (
          <Source id="ais-traffic-source" type="geojson" data={aisGeoJSON}>
            <Layer
              id="ais-traffic-circles"
              type="circle"
              paint={{
                "circle-radius": 3,
                "circle-color": "#22d3ee",
                "circle-opacity": 0.85,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#083344",
              }}
            />
          </Source>
        )}


        {showNetwork && networkData && (
          <Source id="network-source" type="geojson" data={networkData}>
            <Layer
              id="network-lines"
              type="line"
              paint={{
                "line-color": "#475569",
                "line-width": 1,
                "line-opacity": 0.5,
              }}
            />
          </Source>
        )}

        {/* --- ALL ACTIVE ROUTES LAYER --- */}
        {showAllRoutes && allRoutesData && (
          <Source id="all-routes-source" type="geojson" data={allRoutesData}>
            <Layer
              id="all-routes-line"
              type="line"
              paint={{
                "line-color": "#f59e0b", // Amber/Orange
                "line-width": 2,
                "line-opacity": 0.7,
                "line-dasharray": [1, 1], // Tight dots
              }}
            />
          </Source>
        )}

        {/* ACTIVE ROUTE LINE (Dashed) */}
        {routeData && (
          <Source id="route-source" type="geojson" data={routeData.path}>
            <Layer
              id="route-layer"
              type="line"
              paint={{
                "line-color": activeRouteId
                  ? stringToColor(activeRouteId)
                  : "#3b82f6",
                "line-width": 4,
                "line-opacity": 0.9,
                "line-dasharray": [2, 1],
              }}
            />
          </Source>
        )}

        {/* PORTS */}
        {ports?.map((port) => {
          const weather = weatherByPort.get(port.id);
          const waveHeight = weather?.waveHeightM;
          const seaStateColor =
            waveHeight == null
              ? null
              : waveHeight < 0.5
                ? "bg-emerald-400"
                : waveHeight < 1.5
                  ? "bg-amber-400"
                  : "bg-red-500";

          return (
            <Marker
              key={port.id}
              longitude={port.longitude}
              latitude={port.latitude}
              anchor="bottom"
            >
              <div
                className="group relative flex flex-col items-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPortId(port.id);
                }}
              >
                <Anchor
                  size={18}
                  className={`transition-colors ${
                    selectedPortId === port.id
                      ? "text-orange-300"
                      : "text-orange-500/80 hover:text-orange-300"
                  }`}
                />
                {showSeaState && seaStateColor && (
                  <div
                    className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-slate-950 ${seaStateColor}`}
                  />
                )}
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] py-1 px-2 rounded border border-slate-700 whitespace-nowrap z-50">
                  {port.name}
                  {showSeaState && waveHeight != null && (
                    <span className="text-slate-400">
                      {" "}
                      &middot; {waveHeight.toFixed(1)}m waves
                    </span>
                  )}
                </div>
              </div>
            </Marker>
          );
        })}

        {/* VESSELS */}
        {filteredVessels?.map((ship) => {
          const isSelected = selectedVesselId === ship.id;
          return (
            <Marker
              key={ship.id}
              longitude={ship.longitude}
              latitude={ship.latitude}
              anchor="center"
            >
              <div
                className="relative cursor-pointer flex items-center justify-center w-10 h-10 hover:scale-110 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Clicked:", ship.name);
                  // Set clicked ship for the info panel
                  setClickedShipId(clickedShipId === ship.id ? null : ship.id);
                  if (onShipClick) {
                    // Toggle Logic: If clicking the same ship, deselect it (null)
                    onShipClick(isSelected ? null : ship.id);
                  }
                }}
              >
                {/* Selection Ring */}
                {isSelected && (
                  <div className="absolute w-8 h-8 border-2 border-white rounded-full animate-ping"></div>
                )}

                <div style={{ transform: `rotate(${ship.heading}deg)` }}>
                  <Ship
                    size={24}
                    className={`
                            ${ship.status === "AT_SEA" ? "text-green-400" : ""}
                            ${ship.status === "DOCKED" ? "text-yellow-400" : ""}
                            ${ship.status === "DISTRESS" ? "text-red-600 animate-pulse" : ""} 
                            drop-shadow-lg filter
                        `}
                    fill="currentColor"
                  />
                </div>
              </div>
            </Marker>
          );
        })}

        {/* CONTROLS */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 w-44">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
            Layers
          </span>
          <button
            onClick={() => setShowSeaState(!showSeaState)}
            title="Real wave height and swell per port, from Open-Meteo Marine"
            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${showSeaState ? "bg-cyan-500/15 text-cyan-400" : "bg-slate-800 text-slate-500 hover:bg-slate-700"}`}
          >
            <span className="flex items-center gap-2">
              <Waves size={12} /> Sea State
            </span>
            {showSeaState && seaStateStatus === "loading" && (
              <span className="text-[10px] opacity-70">...</span>
            )}
          </button>
          <button
            onClick={() => setShowNetwork(!showNetwork)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${showNetwork ? "bg-blue-500/15 text-blue-400" : "bg-slate-800 text-slate-500 hover:bg-slate-700"}`}
          >
            <Network size={12} /> Lanes
          </button>
          <button
            onClick={() => setShowAISTraffic(!showAISTraffic)}
            title="Real ships from the AIS Ship Tracker (must be running separately on :8090)"
            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${showAISTraffic ? "bg-cyan-500/15 text-cyan-400" : "bg-slate-800 text-slate-500 hover:bg-slate-700"}`}
          >
            <span className="flex items-center gap-2">
              <Radio size={12} /> AIS Live
            </span>
            {showAISTraffic && (
              <span className="text-[10px] font-mono opacity-80 tabular-nums">
                {aisStatus === "live"
                  ? aisVessels.length
                  : aisStatus === "connecting"
                    ? "..."
                    : "off"}
              </span>
            )}
          </button>

          <div className="h-px bg-slate-800 my-1"></div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
            Filters
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setFilterType("ALL")}
              className={`flex-1 px-2 py-1.5 rounded text-[10px] font-semibold transition-colors ${filterType === "ALL" ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterType("TANKER")}
              className={`flex-1 px-2 py-1.5 rounded text-[10px] font-semibold transition-colors ${filterType === "TANKER" ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            >
              OIL
            </button>
            <button
              onClick={() => setFilterType("CONTAINER")}
              className={`flex-1 px-2 py-1.5 rounded text-[10px] font-semibold transition-colors ${filterType === "CONTAINER" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            >
              BOX
            </button>
          </div>
          <button
            onClick={() => setHideDocked(!hideDocked)}
            className={`mt-1 flex items-center justify-between px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-colors ${hideDocked ? "bg-slate-700 text-white" : "text-slate-500 hover:bg-slate-800"}`}
          >
            <span>Hide Docked</span>
            {hideDocked && (
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
            )}
          </button>
          <button
            onClick={() => setShowAllRoutes(!showAllRoutes)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showAllRoutes
                ? "bg-orange-500/15 text-orange-400"
                : "bg-slate-800 text-slate-500 hover:bg-slate-700"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${showAllRoutes ? "bg-orange-500" : "bg-slate-600"}`}
            ></div>
            Fleet Paths
          </button>
        </div>

        {/* SHIP INFO PANEL */}
        {clickedShip && (
          <div className="absolute top-[260px] left-4 z-10 bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 w-44">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Ship Info
              </span>
              <button
                onClick={() => setClickedShipId(null)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Ship size={15} className="text-slate-500" />
                <span className="text-sm font-medium text-white">
                  {clickedShip.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Status:</span>
                <StatusBadge status={clickedShip.status} />
              </div>
            </div>
          </div>
        )}

        {/* SELECTION INFO */}
        {activeShip && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-blue-500/40 text-white px-5 py-2.5 rounded-lg flex items-center gap-3">
            <Ship size={15} className="text-blue-400" />
            <span className="font-medium text-sm">{activeShip.name}</span>
            <span className="text-xs text-slate-500">|</span>
            <span className="text-xs text-slate-300 font-mono tabular-nums">
              {activeShip.speed_knots.toFixed(1)} KN
            </span>
            {!activeRouteId && (
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-medium ml-1">
                NO ROUTE
              </span>
            )}
          </div>
        )}

        {/* AIS VESSEL INFO PANEL - a real ship, not part of the simulated fleet */}
        {clickedAISVessel && (
          <div className="absolute top-4 right-16 z-10 bg-slate-900/90 p-3.5 rounded-lg border border-cyan-500/20 max-w-[220px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-cyan-500 uppercase tracking-wide flex items-center gap-1">
                <Radio size={10} /> Real AIS Vessel
              </span>
              <button
                onClick={() => setClickedAISVessel(null)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="font-bold text-white text-sm">
                {clickedAISVessel.name || `MMSI ${clickedAISVessel.mmsi}`}
              </div>
              <div className="text-slate-400">
                {clickedAISVessel.type_label || "Unknown type"}
                {clickedAISVessel.flag ? ` · ${clickedAISVessel.flag}` : ""}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Speed:</span>
                <span className="font-mono text-slate-200">
                  {clickedAISVessel.sog.toFixed(1)} kn
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="text-slate-200 truncate ml-2">
                  {clickedAISVessel.destination || "-"}
                </span>
              </div>
              {clickedAISVessel.length_m && clickedAISVessel.beam_m && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Size:</span>
                  <span className="font-mono text-slate-200">
                    {clickedAISVessel.length_m}m &times;{" "}
                    {clickedAISVessel.beam_m}m
                  </span>
                </div>
              )}
              {clickedAISVessel.draught_m && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Draught:</span>
                  <span className="font-mono text-slate-200">
                    {clickedAISVessel.draught_m}m
                  </span>
                </div>
              )}
              <div className="text-[10px] text-slate-600 pt-1">
                MMSI {clickedAISVessel.mmsi} · trail/route in the dedicated
                tracker
              </div>
            </div>
          </div>
        )}
      </Map>
      {/* PORT INSPECTOR PANEL */}
      {selectedPort && (
        <PortInspector
          port={selectedPort}
          onClose={() => setSelectedPortId(null)}
          realShipsNearby={realShipsNearSelectedPort}
          seaState={showSeaState ? weatherByPort.get(selectedPort.id) : undefined}
        />
      )}
    </div>
  );
};
