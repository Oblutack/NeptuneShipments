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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white font-sans">
      {/* 1. NAVBAR */}
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl fixed w-full z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
              <Globe className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              Neptune<span className="text-blue-400">Shipments</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
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
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/dashboard"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              Client Portal <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 z-0"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl z-0 opacity-30 pointer-events-none">
          <div className="absolute top-20 right-0 w-96 h-96 bg-blue-500/40 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/30 border border-blue-500/40 text-blue-400 text-xs font-bold uppercase tracking-wider mb-8 shadow-lg shadow-blue-500/20">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-lg shadow-blue-400/50"></span>
            Global Operations Live
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-r from-white via-blue-100 to-cyan-300 bg-clip-text text-transparent leading-tight">
            Powering the Future <br /> of Maritime Logistics
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed">
            Experience industry-grade fleet management with real-time telemetry,
            predictive routing, and autonomous supply chain intelligence.
          </p>

          {/* Quick Track Box */}
          <div className="max-w-md mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-700 p-2 rounded-2xl flex gap-2 shadow-2xl">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={20}
              />
              <input
                type="text"
                placeholder="Tracking ID (e.g. TRK-TEST-01)"
                className="w-full bg-transparent border-none text-white pl-12 pr-4 py-4 focus:outline-none placeholder:text-slate-500 text-sm"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
              />
            </div>
            <button
              onClick={handleQuickTrack}
              className="bg-gradient-to-r from-white to-slate-100 text-slate-950 px-8 py-4 rounded-xl font-bold hover:from-blue-50 hover:to-cyan-50 transition-all shadow-lg"
            >
              Track
            </button>
          </div>
        </div>
      </section>

      {/* 3. FEATURES GRID */}
      <section
        id="services"
        className="py-24 bg-slate-950/50 relative border-t border-slate-900"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-slate-800 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all group">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
                <Anchor size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Global Fleet Command</h3>
              <p className="text-slate-400 leading-relaxed">
                Real-time visualization of vessels, ports, and routes using
                military-grade geospatial precision.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-slate-800 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all group">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/30">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Predictive Analytics</h3>
              <p className="text-slate-400 leading-relaxed">
                AI-driven ETA calculations and fuel consumption modeling for
                maximum operational efficiency.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-slate-800 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all group">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/30">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Secure Operations</h3>
              <p className="text-slate-400 leading-relaxed">
                Enterprise-grade RBAC security ensuring data integrity for
                admins, captains, and clients.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="border-t border-slate-800 py-12 text-slate-400 text-sm bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Globe size={20} className="text-blue-500" />
            <span className="font-bold text-slate-200">NeptuneShipments</span>
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
          <div className="text-slate-500">
            © 2026 Neptune Logistics. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
