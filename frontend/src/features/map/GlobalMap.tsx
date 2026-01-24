import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  useGetRouteByIdQuery,
  useGetNetworkMeshQuery,
  type Vessel,
  type Port,
} from "../api/apiSlice";
import { Ship, Anchor, Network } from "lucide-react";
import { useState } from "react";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const STORM_DATA: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Typhoon Cobra", severity: "High" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-40.0, 35.0],
            [-30.0, 35.0],
            [-25.0, 25.0],
            [-45.0, 25.0],
            [-40.0, 35.0],
          ],
        ],
      },
    },
  ],
};

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
  onShipClick?: (id: string) => void; // Optional for tracking page
}

export const GlobalMap = ({ vessels, ports, onShipClick }: GlobalMapProps) => {
  // 1. Logic to find the active route ID (Demo logic)
  const activeRouteId = vessels?.[0]?.current_route_id;

  // State
  const [showWeather, setShowWeather] = useState(true);
  const [showNetwork, setShowNetwork] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "TANKER" | "CONTAINER">(
    "ALL",
  );
  const [hideDocked, setHideDocked] = useState(false);

  // Queries
  const { data: networkData } = useGetNetworkMeshQuery(undefined, {
    skip: !showNetwork,
  });
  const { data: routeData } = useGetRouteByIdQuery(activeRouteId || "", {
    skip: !activeRouteId,
  });

  // Filtering Logic
  const filteredVessels = vessels?.filter((ship) => {
    if (hideDocked && ship.status === "DOCKED") return false;
    if (filterType !== "ALL" && ship.type !== filterType) return false;
    return true;
  });

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-slate-700 relative bg-gray-900 h-[600px]">
      <Map
        mapLib={mapboxgl}
        initialViewState={{
          longitude: 20.0,
          latitude: 35.0,
          zoom: 3.5,
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={TOKEN}
        projection={{ name: "globe" }}
        fog={{
          color: "rgb(20, 30, 40)",
          "high-color": "rgb(200, 200, 250)",
          "horizon-blend": 0.2,
        }}
      >
        <NavigationControl position="top-right" />

        {/* --- 1. WEATHER LAYER (Added back) --- */}
        {showWeather && (
          <Source id="storm-source" type="geojson" data={STORM_DATA}>
            <Layer
              id="storm-fill"
              type="fill"
              paint={{ "fill-color": "#ef4444", "fill-opacity": 0.3 }}
            />
            <Layer
              id="storm-outline"
              type="line"
              paint={{ "line-color": "#b91c1c", "line-width": 2 }}
            />
          </Source>
        )}

        {/* --- 2. NETWORK LAYER (Added back) --- */}
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

        {/* --- 3. ACTIVE ROUTE LAYER --- */}
        {routeData && (
          <Source id="route-source" type="geojson" data={routeData.path}>
            <Layer
              id="route-layer"
              type="line"
              paint={{
                "line-color": routeData.id
                  ? stringToColor(routeData.id)
                  : "#3b82f6",
                "line-width": 3,
                "line-opacity": 0.8,
                "line-dasharray": [2, 1],
              }}
            />
          </Source>
        )}

        {/* --- 4. PORTS --- */}
        {ports?.map((port) => (
          <Marker
            key={port.id}
            longitude={port.longitude}
            latitude={port.latitude}
            anchor="bottom"
          >
            <div className="group relative flex flex-col items-center cursor-pointer">
              <Anchor
                size={20}
                className="text-orange-500 hover:text-orange-300 transition-colors"
              />
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black/80 text-white text-xs p-2 rounded whitespace-nowrap border border-orange-500/30 z-50">
                <p className="font-bold">{port.name}</p>
              </div>
            </div>
          </Marker>
        ))}

        {/* --- 5. VESSELS (Using Filtered List) --- */}
        {filteredVessels?.map((ship) => (
          <Marker
            key={ship.id}
            longitude={ship.longitude}
            latitude={ship.latitude}
            anchor="center"
          >
            <div
              className="group relative cursor-pointer"
              onClick={() => onShipClick && onShipClick(ship.id)}
            >
              <div
                style={{ transform: `rotate(${ship.heading}deg)` }}
                className="transition-transform duration-500"
              >
                <Ship
                  size={24}
                  className={`
                        ${ship.status === "AT_SEA" ? "text-green-400" : ""}
                        ${ship.status === "DOCKED" ? "text-yellow-400" : ""}
                        ${ship.status === "DISTRESS" ? "text-red-600 animate-pulse drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" : ""} 
                        drop-shadow-lg
                    `}
                  fill="currentColor"
                />
              </div>
            </div>
          </Marker>
        ))}

        {/* --- CONTROL PANEL (Cleaned up) --- */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-slate-900/90 p-3 rounded-xl border border-slate-700 shadow-xl backdrop-blur-md">
          <span className="text-xs font-bold text-slate-400 uppercase mb-1">
            Layers
          </span>

          <button
            onClick={() => setShowWeather(!showWeather)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              showWeather
                ? "bg-red-500/20 text-red-400 border border-red-500/50"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${showWeather ? "bg-red-500 animate-pulse" : "bg-slate-600"}`}
            ></div>
            Storms
          </button>

          <button
            onClick={() => setShowNetwork(!showNetwork)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              showNetwork
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            <Network size={12} /> Lanes
          </button>

          <div className="h-px bg-slate-700 my-1"></div>
          <span className="text-xs font-bold text-slate-400 uppercase mb-1">
            Filters
          </span>

          <div className="flex gap-1">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-2 py-1 rounded text-[10px] font-bold ${filterType === "ALL" ? "bg-white text-black" : "bg-slate-800 text-slate-400"}`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterType("TANKER")}
              className={`px-2 py-1 rounded text-[10px] font-bold ${filterType === "TANKER" ? "bg-yellow-600 text-white" : "bg-slate-800 text-slate-400"}`}
            >
              OIL
            </button>
            <button
              onClick={() => setFilterType("CONTAINER")}
              className={`px-2 py-1 rounded text-[10px] font-bold ${filterType === "CONTAINER" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
            >
              BOX
            </button>
          </div>

          <button
            onClick={() => setHideDocked(!hideDocked)}
            className={`mt-1 flex items-center justify-between px-2 py-1 rounded text-[10px] font-bold ${
              hideDocked
                ? "bg-slate-700 text-white"
                : "text-slate-500 hover:bg-slate-800"
            }`}
          >
            <span>Hide Docked</span>
            {hideDocked && (
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            )}
          </button>
        </div>
      </Map>
    </div>
  );
};
