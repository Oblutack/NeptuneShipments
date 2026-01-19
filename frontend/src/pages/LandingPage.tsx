import { Link, useNavigate } from 'react-router-dom';
import { Globe, ArrowRight, ShieldCheck, Anchor, BarChart3, Search } from 'lucide-react';
import { useState } from 'react';

export const LandingPage = () => {
  const [trackId, setTrackId] = useState('');
  const navigate = useNavigate();

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackId) {
        navigate(`/track?id=${encodeURIComponent(trackId.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      
      {/* 1. NAVBAR */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                    <Globe className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-bold tracking-tight">Neptune<span className="text-blue-500">Shipments</span></span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
                <a href="#services" className="hover:text-white transition-colors">Services</a>
                <a href="#fleet" className="hover:text-white transition-colors">Global Fleet</a>
                <a href="#technology" className="hover:text-white transition-colors">Technology</a>
            </div>

            <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white">Sign In</Link>
                <Link to="/dashboard" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2">
                    Client Portal <ArrowRight size={16} />
                </Link>
            </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 z-0"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl z-0 opacity-20 pointer-events-none">
            {/* You can put a grid pattern or world map SVG here */}
            <div className="absolute top-20 right-0 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                Global Operations Live
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
                Powering the Future <br/> of Maritime Logistics
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                Experience industry-grade fleet management with real-time telemetry, 
                predictive routing, and autonomous supply chain intelligence.
            </p>

            {/* Quick Track Box */}
            <div className="max-w-md mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-700 p-2 rounded-xl flex gap-2 shadow-2xl">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input 
                        type="text" 
                        placeholder="Tracking ID (e.g. TRK-TEST-01)" 
                        className="w-full bg-transparent border-none text-white pl-10 pr-4 py-3 focus:outline-none placeholder:text-slate-600"
                        value={trackId}
                        onChange={(e) => setTrackId(e.target.value)}
                    />
                </div>
                <button onClick={handleQuickTrack} className="bg-white text-slate-950 px-6 py-3 rounded-lg font-bold hover:bg-slate-200 transition-colors">
                    Track
                </button>
            </div>
        </div>
      </section>

      {/* 3. FEATURES GRID */}
      <section id="services" className="py-24 bg-slate-950 relative border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-colors group">
                    <div className="w-12 h-12 bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                        <Anchor />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Global Fleet Command</h3>
                    <p className="text-slate-400 leading-relaxed">
                        Real-time visualization of vessels, ports, and routes using military-grade geospatial precision.
                    </p>
                </div>

                {/* Feature 2 */}
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-colors group">
                    <div className="w-12 h-12 bg-purple-900/20 rounded-lg flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                        <BarChart3 />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Predictive Analytics</h3>
                    <p className="text-slate-400 leading-relaxed">
                        AI-driven ETA calculations and fuel consumption modeling for maximum operational efficiency.
                    </p>
                </div>

                {/* Feature 3 */}
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-colors group">
                    <div className="w-12 h-12 bg-emerald-900/20 rounded-lg flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                        <ShieldCheck />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Secure Operations</h3>
                    <p className="text-slate-400 leading-relaxed">
                        Enterprise-grade RBAC security ensuring data integrity for admins, captains, and clients.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="border-t border-slate-900 py-12 text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
                <Globe size={20} className="text-slate-600" />
                <span className="font-bold text-slate-300">NeptuneShipments</span>
            </div>
            <div className="flex gap-6">
                <a href="#" className="hover:text-white">Privacy Policy</a>
                <a href="#" className="hover:text-white">Terms of Service</a>
                <a href="#" className="hover:text-white">Contact Support</a>
            </div>
            <div>
                © 2026 Neptune Logistics. All rights reserved.
            </div>
        </div>
      </footer>
    </div>
  );
};