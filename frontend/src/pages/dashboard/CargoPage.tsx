import { ShipmentForm } from "../../features/shipments/ShipmentForm";
import { ShipmentList } from "../../features/shipments/ShipmentList";
import { Package } from "lucide-react";

export const CargoPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-[1800px] mx-auto space-y-8">
        {/* ✨ Modern Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/20">
              <Package className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Cargo Operations
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Create and manage shipment bookings
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* New Booking Form */}
          <div className="lg:col-span-1">
            <ShipmentForm />
          </div>

          {/* Active Manifest List */}
          <div className="lg:col-span-2">
            <ShipmentList />
          </div>
        </div>
      </div>
    </div>
  );
};
