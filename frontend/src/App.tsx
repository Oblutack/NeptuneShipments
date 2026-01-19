import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { TrackingPage } from "./pages/TrackingPage";
import { LayoutDashboard, Search } from "lucide-react";
import { LoginPage } from "./pages/LoginPage";

function App() {
  return (
    <BrowserRouter>
      <nav className="fixed top-4 right-4 z-50 flex gap-2">
        <Link
          to="/"
          className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700"
          title="Admin Dashboard"
        >
          <LayoutDashboard size={20} />
        </Link>
        <Link
          to="/track"
          className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700"
          title="Customer Tracking"
        >
          <Search size={20} />
        </Link>
      </nav>

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/track" element={<TrackingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
