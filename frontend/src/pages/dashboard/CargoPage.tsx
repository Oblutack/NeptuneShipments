import { ShipmentForm } from "../../features/shipments/ShipmentForm";
import { ShipmentList } from "../../features/shipments/ShipmentList";
import { Package } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";

export const CargoPage = () => {
  return (
    <>
      <PageHeader
        icon={Package}
        title="Cargo Operations"
        subtitle="Create and manage shipment bookings"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <ShipmentForm />
        </div>
        <div className="lg:col-span-2">
          <ShipmentList />
        </div>
      </div>
    </>
  );
};
