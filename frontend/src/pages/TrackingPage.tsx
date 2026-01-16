import { Search, Globe } from 'lucide-react';
import { useState } from 'react';

export const TrackingPage = () => {
  const [trackId, setTrackId] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Searching for: ${trackId} (Logic coming soon!)`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-10 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-xl text-center space-y-8">
        
        {/* Logo */}
        <div className="flex justify-center items-center gap-3 mb-8">
            <Globe className="text-blue-500 w-16 h-16" />
            <h1 className="text-5xl font-bold text-white tracking-tight">Neptune</h1>
        </div>

        {/* Search Box */}
        <div className="bg-slate-900/80 backdrop-blur-md p-8 rounded-2xl border border-slate-700 shadow-2xl">
            <h2 className="text-slate-300 mb-6 text-lg">Track your ocean freight in real-time</h2>
            
            <form onSubmit={handleSearch} className="relative">
                <input 
                    type="text" 
                    placeholder="Enter Tracking Number (e.g., TRK-001)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    value={trackId}
                    onChange={(e) => setTrackId(e.target.value)}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                
                <button 
                    type="submit"
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    Track Shipment
                </button>
            </form>
        </div>

        <div className="text-slate-500 text-sm">
            Powered by NeptuneShipments Global Logistics Network
        </div>
      </div>
    </div>
  );
};