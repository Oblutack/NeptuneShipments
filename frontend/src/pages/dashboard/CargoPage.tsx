import { ShipmentForm } from '../../features/shipments/ShipmentForm';
import { ShipmentList } from '../../features/shipments/ShipmentList';

export const CargoPage = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Cargo Operations</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit">
            <h2 className="text-xl font-bold mb-4">New Booking</h2>
            <ShipmentForm />
        </div>
        <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-4">Active Manifest</h2>
            <ShipmentList />
        </div>
      </div>
    </div>
  );
};