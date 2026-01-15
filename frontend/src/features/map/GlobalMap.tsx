import Map, { Marker, NavigationControl } from 'react-map-gl';
import mapboxgl from 'mapbox-gl'; // <--- 1. Import the raw engine
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Vessel } from '../api/apiSlice';
import { Ship } from 'lucide-react';

// Get token from .env
const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface GlobalMapProps {
  vessels: Vessel[] | undefined;
}

export const GlobalMap = ({ vessels }: GlobalMapProps) => {
  // Console log to debug if token is missing
  if (!TOKEN) {
    console.error("Mapbox Token is missing! Check your .env file.");
  }

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-slate-700 relative bg-gray-900" style={{ height: '600px' }}>
      <Map
        // 2. Explicitly tell React which map library to use
        mapLib={mapboxgl} 
        
        initialViewState={{
          longitude: 32.5,
          latitude: 30.0,
          zoom: 4
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={TOKEN}
        projection={{ name: 'globe' }} 
        fog={{
            color: 'rgb(20, 30, 40)',
            'high-color': 'rgb(200, 200, 250)', 
            'horizon-blend': 0.2
        }}
      >
        <NavigationControl position="top-right" />

        {vessels?.map((ship) => (
          <Marker 
            key={ship.id} 
            longitude={ship.longitude} 
            latitude={ship.latitude}
            anchor="center"
          >
            <div className="group relative cursor-pointer">
              <div 
                style={{ transform: `rotate(${ship.heading}deg)` }}
                className="transition-transform duration-500"
              >
                <Ship 
                    size={24} 
                    className={`${ship.status === 'AT_SEA' ? 'text-green-400' : 'text-yellow-400'} drop-shadow-lg`} 
                    fill="currentColor"
                />
              </div>
              
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 bg-black/90 text-white text-xs p-2 rounded hidden group-hover:block z-50 border border-slate-600">
                <p className="font-bold">{ship.name}</p>
                <p className="text-slate-400">{ship.type}</p>
                <p>{ship.speed_knots} knots</p>
              </div>
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
};