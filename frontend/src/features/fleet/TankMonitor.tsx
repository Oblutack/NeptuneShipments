import { useGetTanksQuery } from '../api/apiSlice';
import { Loader2, Droplets, AlertTriangle } from 'lucide-react';

interface TankMonitorProps {
  vesselId: string;
}

export const TankMonitor = ({ vesselId }: TankMonitorProps) => {
  const { data: tanks, isLoading } = useGetTanksQuery(vesselId);

  if (isLoading) return <div className="p-4 flex gap-2"><Loader2 className="animate-spin" /> Scanning Sensors...</div>;

  if (!tanks || tanks.length === 0) {
    return (
        <div className="p-6 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
            <AlertTriangle className="mx-auto mb-2 opacity-50" />
            No Liquid Storage Detected.<br/>
            <span className="text-xs">(This might be a Container Ship)</span>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {tanks.map((tank) => {
        const percentage = (tank.current_level / tank.capacity_barrels) * 100;
        
        // Dynamic Color: Red if empty/full, Blue/Yellow/Green for liquid types
        const liquidColor = tank.cargo_type === 'Crude Oil' ? 'bg-yellow-600' : 'bg-blue-500';

        return (
          <div key={tank.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 relative overflow-hidden group">
            
            {/* Header */}
            <div className="relative z-10 flex justify-between items-start mb-8">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{tank.name}</span>
                {tank.is_filling && <Droplets size={14} className="text-blue-400 animate-bounce" />}
            </div>

            {/* Liquid Visual */}
            <div className="absolute bottom-0 left-0 w-full bg-slate-800 h-full opacity-30"></div>
            <div 
                className={`absolute bottom-0 left-0 w-full transition-all duration-1000 ${liquidColor} opacity-80`} 
                style={{ height: `${percentage}%` }}
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
            </div>

            {/* Text Overlay */}
            <div className="relative z-10 text-right mt-4">
                <div className="text-2xl font-mono font-bold text-white">
                    {percentage.toFixed(1)}<span className="text-sm">%</span>
                </div>
                <div className="text-xs text-slate-400">
                    {tank.current_level.toLocaleString()} / {tank.capacity_barrels.toLocaleString()} BBL
                </div>
                <div className="text-[10px] uppercase mt-1 text-slate-500 font-bold">
                    {tank.cargo_type}
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};