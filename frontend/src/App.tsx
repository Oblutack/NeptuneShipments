import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { TrackingPage } from "./pages/TrackingPage";
import { LoginPage } from "./pages/LoginPage";
import { RequireAuth } from "./features/auth/RequireAuth";
import { LayoutDashboard, Search, LogOut } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { logout, selectCurrentUser } from "./features/auth/authSlice";
import { LandingPage } from "./pages/LandingPage";

function App() {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();

  return (
    <BrowserRouter>
      {/* Navigation Bar */}
      <nav className="fixed top-4 right-4 z-50 flex gap-2">
        {/* Only show Dashboard link if logged in */}
        {user && (
          <>
            <Link
              to="/"
              className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700"
              title="Admin Dashboard"
            >
              <LayoutDashboard size={20} />
            </Link>
            <button
              onClick={() => dispatch(logout())}
              className="p-2 bg-red-900/50 rounded-full text-red-200 hover:bg-red-800 border border-red-700"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </>
        )}
        <Link
          to="/track"
          className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700"
          title="Customer Tracking"
        >
          <Search size={20} />
        </Link>
      </nav>

      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/track" element={<TrackingPage />} />

        {/* PROTECTED */}
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
