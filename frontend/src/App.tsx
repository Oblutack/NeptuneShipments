import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { TrackingPage } from "./pages/TrackingPage";
import { RequireAuth } from "./features/auth/RequireAuth";
import { DashboardLayout } from "./layouts/DashboardLayout"; // <--- NEW LAYOUT
import { FleetPage } from "./pages/dashboard/FleetPage";
import { CargoPage } from "./pages/dashboard/CargoPage";
import { GlobalMap } from "./features/map/GlobalMap"; // We can use this directly for map page
import { useGetVesselsQuery, useGetPortsQuery } from "./features/api/apiSlice"; // Need for map wrapper
import { StatsPage } from "./pages/dashboard/StatsPage";
import { MapCommandDeck } from "./features/map/MapCommandDeck";
import { SettingsPage } from "./pages/dashboard/SettingsPage";
import { MaintenancePage } from "./pages/dashboard/MaintenancePage";

// Wrapper for Map Page to handle data fetching
const MapPage = () => {
  const { data: vessels } = useGetVesselsQuery(undefined, {
    pollingInterval: 2000,
  });
  const { data: ports } = useGetPortsQuery();

  return (
    <div className="space-y-6">
      {/* 1. The Map */}
      <div className="h-[600px]">
        <GlobalMap vessels={vessels} ports={ports} onShipClick={() => {}} />
      </div>

      {/* 2. The Command Deck (New) */}
      <MapCommandDeck />
    </div>
  );
};

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
            <Route index element={<StatsPage />} />
            <Route path="fleet" element={<FleetPage />} />
            <Route path="cargo" element={<CargoPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="maintenance" element={<MaintenancePage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
