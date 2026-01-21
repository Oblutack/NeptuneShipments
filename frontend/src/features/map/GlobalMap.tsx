import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl"; // <--- Import Source/Layer
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useGetRouteByIdQuery, type Vessel, type Port } from "../api/apiSlice"; // <--- Import Hook
import { Ship, Anchor } from "lucide-react";
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

interface GlobalMapProps {
  vessels: Vessel[] | undefined;
  ports: Port[] | undefined;
  onShipClick: (id: string) => void;
}

export const GlobalMap = ({ vessels, ports, onShipClick }: GlobalMapProps) => {
  // 1. Logic to find the active route ID
  // For this demo, we just grab the route from the first ship (Ever Given)
  // In a real app, you might select a ship to see its specific route
  const activeRouteId = vessels?.[0]?.current_route_id;
  const [showWeather, setShowWeather] = useState(true);
  // 2. Fetch the route data (skip if no ID)
  const { data: routeData } = useGetRouteByIdQuery(activeRouteId || "", {
    skip: !activeRouteId,
  });

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-slate-700 relative bg-gray-900 h-[600px]">
      <Map
        mapLib={mapboxgl}
        initialViewState={{
          longitude: 20.0, // Center on Mediterranean
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

        {/* --- WEATHER / HAZARD LAYER --- */}
        {showWeather && (
          <Source id="storm-source" type="geojson" data={STORM_DATA}>
            {/* The Red Fill */}
            <Layer
              id="storm-fill"
              type="fill"
              paint={{
                "fill-color": "#ef4444", // Tailwind Red-500
                "fill-opacity": 0.3,
              }}
            />
            {/* The Red Outline */}
            <Layer
              id="storm-outline"
              type="line"
              paint={{
                "line-color": "#b91c1c", // Tailwind Red-700
                "line-width": 2,
              }}
            />
          </Source>
        )}

        {/* --- RENDER ROUTE LINE --- */}
        {routeData && (
          <Source id="route-source" type="geojson" data={routeData.path}>
            <Layer
              id="route-layer"
              type="line"
              paint={{
                "line-color": "#3b82f6", // Tailwind Blue-500
                "line-width": 3,
                "line-opacity": 0.8,
                "line-dasharray": [2, 1], // Dashed line effect
              }}
            />
          </Source>
        )}

        {/* --- RENDER PORTS --- */}
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
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black/80 text-white text-xs p-2 rounded whitespace-nowrap border border-orange-500/30 z-50">
                <p className="font-bold">{port.name}</p>
              </div>
            </div>
          </Marker>
        ))}

        {/* --- RENDER VESSELS --- */}
        {vessels?.map((ship) => (
          <Marker
            key={ship.id}
            longitude={ship.longitude}
            latitude={ship.latitude}
            anchor="center"
          >
            <div
              className="group relative cursor-pointer"
              onClick={() => onShipClick(ship.id)}
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
        {/* WEATHER CONTROL BUTTON */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => setShowWeather(!showWeather)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold shadow-xl transition-all ${
              showWeather
                ? "bg-red-500/80 text-white hover:bg-red-600"
                : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${showWeather ? "bg-white animate-pulse" : "bg-slate-500"}`}
            ></div>
            STORM WARNING
          </button>
        </div>
      </Map>
    </div>
  );
};
