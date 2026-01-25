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
  onShipClick?: (id: string | null) => void; // <--- Allow null here
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
    <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-slate-700 relative bg-gray-900 h-[600px]">
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
        onClick={() => {
          // Optional: Click empty space to deselect
          // if (onShipClick) onShipClick(null);
        }}
      >
        <NavigationControl position="top-right" />

        {/* LAYERS */}
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
        {ports?.map((port) => (
          <Marker
            key={port.id}
            longitude={port.longitude}
            latitude={port.latitude}
            anchor="bottom"
          >
            <div className="group relative flex flex-col items-center cursor-pointer">
              <Anchor
                size={18}
                className="text-orange-500/80 hover:text-orange-300 transition-colors"
              />
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black/80 text-white text-[10px] p-1 px-2 rounded border border-orange-500/30 whitespace-nowrap z-50">
                {port.name}
              </div>
            </div>
          </Marker>
        ))}

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
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-slate-900/90 p-3 rounded-xl border border-slate-700 shadow-xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            Layers
          </span>
          <button
            onClick={() => setShowWeather(!showWeather)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showWeather ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-slate-800 text-slate-500"}`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${showWeather ? "bg-red-500" : "bg-slate-600"}`}
            ></div>{" "}
            Storms
          </button>
          <button
            onClick={() => setShowNetwork(!showNetwork)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showNetwork ? "bg-blue-500/20 text-blue-400 border border-blue-500/50" : "bg-slate-800 text-slate-500"}`}
          >
            <Network size={12} /> Lanes
          </button>

          <div className="h-px bg-slate-700 my-1"></div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            Filters
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setFilterType("ALL")}
              className={`flex-1 px-2 py-1 rounded text-[10px] font-bold ${filterType === "ALL" ? "bg-white text-black" : "bg-slate-800 text-slate-400"}`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterType("TANKER")}
              className={`flex-1 px-2 py-1 rounded text-[10px] font-bold ${filterType === "TANKER" ? "bg-yellow-600 text-white" : "bg-slate-800 text-slate-400"}`}
            >
              OIL
            </button>
            <button
              onClick={() => setFilterType("CONTAINER")}
              className={`flex-1 px-2 py-1 rounded text-[10px] font-bold ${filterType === "CONTAINER" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
            >
              BOX
            </button>
          </div>
          <button
            onClick={() => setHideDocked(!hideDocked)}
            className={`mt-1 flex items-center justify-between px-2 py-1 rounded text-[10px] font-bold ${hideDocked ? "bg-slate-700 text-white" : "text-slate-500 hover:bg-slate-800"}`}
          >
            <span>Hide Docked</span>
            {hideDocked && (
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            )}
          </button>
          <button
            onClick={() => setShowAllRoutes(!showAllRoutes)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              showAllRoutes
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/50"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${showAllRoutes ? "bg-orange-500" : "bg-slate-600"}`}
            ></div>
            Fleet Paths
          </button>
        </div>

        {/* SELECTION INFO */}
        {activeShip && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-blue-500/50 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <Ship size={16} className="text-blue-400" />
            <span className="font-bold text-sm">{activeShip.name}</span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-300 font-mono">
              {activeShip.speed_knots.toFixed(1)} KN
            </span>
            {!activeRouteId && (
              <span className="text-xs text-yellow-500 font-bold ml-2">
                NO ROUTE
              </span>
            )}
          </div>
        )}
      </Map>
    </div>
  );
};
