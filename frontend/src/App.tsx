import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { TrackingPage } from './pages/TrackingPage';
import { RequireAuth } from './features/auth/RequireAuth';
import { DashboardLayout } from './layouts/DashboardLayout'; // <--- NEW LAYOUT
import { FleetPage } from './pages/dashboard/FleetPage';
import { CargoPage } from './pages/dashboard/CargoPage';
import { GlobalMap } from './features/map/GlobalMap'; // We can use this directly for map page
import { useGetVesselsQuery, useGetPortsQuery } from './features/api/apiSlice'; // Need for map wrapper

// Wrapper for Map Page to handle data fetching
const MapPage = () => {
    const { data: vessels } = useGetVesselsQuery(undefined, { pollingInterval: 2000 });
    const { data: ports } = useGetPortsQuery();
    return <div className="h-[85vh]"><GlobalMap vessels={vessels} ports={ports} onShipClick={() => {}} /></div>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/track" element={<TrackingPage />} />

        {/* ADMIN PORTAL */}
        <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<div className="text-2xl text-slate-400">Overview Stats Coming Soon...</div>} />
                <Route path="fleet" element={<FleetPage />} />
                <Route path="cargo" element={<CargoPage />} />
                <Route path="map" element={<MapPage />} />
            </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;