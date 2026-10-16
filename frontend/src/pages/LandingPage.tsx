import { Link, useNavigate } from "react-router-dom";
import {
  Globe,
  ArrowRight,
  ShieldCheck,
  Anchor,
  BarChart3,
  Search,
} from "lucide-react";
import { useState } from "react";

export const LandingPage = () => {
  const [trackId, setTrackId] = useState("");
  const navigate = useNavigate();

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackId) {
      navigate(`/track?id=${encodeURIComponent(trackId.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* 1. NAVBAR */}
      <nav className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 p-1.5 rounded-md">
              <Globe className="text-white" size={18} />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Neptune<span className="text-slate-500">Shipments</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#services" className="hover:text-white transition-colors">
              Services
            </a>
            <a href="#fleet" className="hover:text-white transition-colors">
              Global Fleet
            </a>
            <a
              href="#technology"
              className="hover:text-white transition-colors"
            >
              Technology
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/dashboard"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              Client Portal <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="pt-40 pb-24 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium uppercase tracking-wide mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Global Operations Live
          </div>
          <h1 className="text-4xl lg:text-6xl font-semibold tracking-tight mb-6 leading-tight">
            Powering the Future <br /> of Maritime Logistics
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Industry-grade fleet management with real-time telemetry,
            predictive routing, and operational intelligence.
          </p>

          {/* Quick Track Box */}
          <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-1.5 rounded-lg flex gap-1.5">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                size={16}
              />
              <input
                type="text"
                placeholder="Tracking ID (e.g. TRK-TEST-01)"
                className="w-full bg-transparent border-none text-white pl-10 pr-3 py-3 text-sm focus:outline-none placeholder:text-slate-500"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
              />
            </div>
            <button
              onClick={handleQuickTrack}
              className="bg-white text-slate-950 px-6 py-3 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Track
            </button>
          </div>
        </div>
      </section>

      {/* 3. FEATURES GRID */}
      <section id="services" className="py-20 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 bg-slate-800 rounded-md flex items-center justify-center text-blue-400 mb-5">
                <Anchor size={20} />
              </div>
              <h3 className="text-base font-semibold mb-2">
                Global Fleet Command
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Real-time visualization of vessels, ports, and routes with
                precise geospatial tracking.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 bg-slate-800 rounded-md flex items-center justify-center text-blue-400 mb-5">
                <BarChart3 size={20} />
              </div>
              <h3 className="text-base font-semibold mb-2">
                Predictive Analytics
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Automated ETA calculations and fuel consumption modeling for
                maximum operational efficiency.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 bg-slate-800 rounded-md flex items-center justify-center text-blue-400 mb-5">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-base font-semibold mb-2">
                Secure Operations
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Role-based access control ensuring data integrity for admins
                and clients.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="py-10 text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-slate-600" />
            <span className="font-medium text-slate-300">
              NeptuneShipments
            </span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact Support
            </a>
          </div>
          <div>&copy; 2026 Neptune Logistics. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
