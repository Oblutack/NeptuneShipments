import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { selectCurrentUser, logout } from "../features/auth/authSlice";
import { useGetShipmentsQuery } from "../features/api/apiSlice";
import { Globe, Package, LogOut, Loader2, ArrowRight, MapPin } from "lucide-react";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ShipmentForm } from "../features/shipments/ShipmentForm";

// A deliberately small, scoped view - a CLIENT only ever sees their own
// shipments (enforced server-side in GetAllShipments, not just by not
// showing a link to the rest of the app), not the full ops dashboard.
export const ClientPortalPage = () => {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: shipments, isLoading } = useGetShipmentsQuery(undefined, {
    pollingInterval: 10000,
  });

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 p-1.5 rounded-md">
              <Globe className="text-white" size={18} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">
              Neptune<span className="text-slate-500">Shipments</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              {user?.full_name}
              {user?.company_name ? ` - ${user.company_name}` : ""}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-6">
            <Package className="text-slate-500" size={18} />
            <h1 className="text-lg font-semibold text-white">My Shipments</h1>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-400" size={24} />
            </div>
          ) : !shipments || shipments.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
              <Package className="mx-auto mb-4 text-slate-600" size={40} />
              <h3 className="text-base font-semibold text-white mb-1.5">
                No shipments yet
              </h3>
              <p className="text-sm text-slate-500">
                Shipments booked under your account will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {shipments.map((s) => (
                <Link
                  key={s.id}
                  to={`/track?id=${encodeURIComponent(s.tracking_number)}`}
                  className="block bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg p-4 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm">
                          {s.tracking_number}
                        </span>
                        <StatusBadge status={s.status} />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin size={11} />
                        {s.origin_port_name || s.origin_port_id}
                        <ArrowRight size={11} />
                        {s.destination_port_name || s.destination_port_id}
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-600" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <ShipmentForm />
        </div>
      </div>
    </div>
  );
};
