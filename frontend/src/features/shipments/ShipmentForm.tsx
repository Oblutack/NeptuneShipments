import { useState, type FormEvent } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../auth/authSlice";
import {
  useGetPortsQuery,
  useGetVesselsQuery,
  useCreateShipmentMutation,
} from "../api/apiSlice";
import { Package, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export const ShipmentForm = () => {
  // A CLIENT books cargo, an operator dispatches it: clients never pick (or
  // even fetch) vessels - their booking is created unassigned and an
  // operator assigns it - and their own name is filled in for them.
  const user = useSelector(selectCurrentUser);
  const isClient = user?.role === "CLIENT";
  const defaultCustomer = isClient ? user?.company_name || user?.full_name || "" : "";

  const { data: ports, isLoading: portsLoading } = useGetPortsQuery();
  const { data: vessels, isLoading: vesselsLoading } = useGetVesselsQuery(
    undefined,
    { skip: isClient },
  );
  const [createShipment, { isLoading: isSubmitting }] =
    useCreateShipmentMutation();

  const [formData, setFormData] = useState({
    tracking_number: "",
    customer_name: defaultCustomer,
    origin_port_id: "",
    destination_port_id: "",
    vessel_id: "",
    description: "",
    weight_kg: "",
    container_number: "",
  });

  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitStatus("idle");
    setErrorMessage("");

    // Validation
    if (
      !formData.tracking_number ||
      !formData.customer_name ||
      !formData.origin_port_id ||
      !formData.destination_port_id
    ) {
      setSubmitStatus("error");
      setErrorMessage("Please fill in all required fields");
      return;
    }

    if (formData.origin_port_id === formData.destination_port_id) {
      setSubmitStatus("error");
      setErrorMessage("Origin and destination ports must be different");
      return;
    }

    try {
      // Prepare payload - only include vessel_id if it's selected
      const payload = {
        tracking_number: formData.tracking_number,
        customer_name: formData.customer_name,
        origin_port_id: formData.origin_port_id,
        destination_port_id: formData.destination_port_id,
        description: formData.description,
        weight_kg: parseFloat(formData.weight_kg) || 0,
        container_number: formData.container_number,
        status: "PENDING",
        ...(!isClient && formData.vessel_id && { vessel_id: formData.vessel_id }),
      };

      await createShipment(payload).unwrap();

      setSubmitStatus("success");

      // Reset form after successful submission
      setFormData({
        tracking_number: "",
        customer_name: defaultCustomer,
        origin_port_id: "",
        destination_port_id: "",
        vessel_id: "",
        description: "",
        weight_kg: "",
        container_number: "",
      });

      // Hide success message after 3 seconds
      setTimeout(() => setSubmitStatus("idle"), 3000);
    } catch (err) {
      setSubmitStatus("error");
      setErrorMessage("Failed to create shipment. Please try again.");
      console.error("Shipment creation error:", err);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const isLoading = portsLoading || (!isClient && vesselsLoading);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden h-fit">
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Package className="text-slate-500" size={16} />
          <h3 className="text-sm font-semibold text-white">
            {isClient ? "Book a Shipment" : "New Booking"}
          </h3>
        </div>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="animate-spin text-blue-400" size={28} />
            <span className="text-slate-400 font-medium">
              Loading form data...
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Status Messages */}
            {submitStatus === "success" && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm p-3 rounded-md">
                <CheckCircle2 size={18} />
                <span>Shipment created successfully!</span>
              </div>
            )}

            {submitStatus === "error" && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 text-sm p-3 rounded-md">
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Tracking Number */}
              <div>
                <label
                  htmlFor="tracking_number"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Tracking Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="tracking_number"
                  name="tracking_number"
                  value={formData.tracking_number}
                  onChange={handleChange}
                  placeholder="TRK-123456"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Customer Name */}
              <div>
                <label
                  htmlFor="customer_name"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Customer Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="customer_name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Origin Port */}
              <div>
                <label
                  htmlFor="origin_port_id"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Origin Port <span className="text-red-400">*</span>
                </label>
                <select
                  id="origin_port_id"
                  name="origin_port_id"
                  value={formData.origin_port_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select origin port</option>
                  {ports?.map((port) => (
                    <option key={port.id} value={port.id}>
                      {port.name} ({port.un_locode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Port */}
              <div>
                <label
                  htmlFor="destination_port_id"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Destination Port <span className="text-red-400">*</span>
                </label>
                <select
                  id="destination_port_id"
                  name="destination_port_id"
                  value={formData.destination_port_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select destination port</option>
                  {ports?.map((port) => (
                    <option key={port.id} value={port.id}>
                      {port.name} ({port.un_locode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Assign Vessel (Optional) - operators only */}
              {!isClient && (
                <div>
                  <label
                    htmlFor="vessel_id"
                    className="block text-xs font-medium text-slate-400 mb-1.5"
                  >
                    Assign Vessel{" "}
                    <span className="text-slate-500">(Optional)</span>
                  </label>
                  <select
                    id="vessel_id"
                    name="vessel_id"
                    value={formData.vessel_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No vessel assigned yet</option>
                    {vessels?.map((vessel) => (
                      <option key={vessel.id} value={vessel.id}>
                        {vessel.name} ({vessel.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Container Number */}
              <div>
                <label
                  htmlFor="container_number"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Container Number
                </label>
                <input
                  type="text"
                  id="container_number"
                  name="container_number"
                  value={formData.container_number}
                  onChange={handleChange}
                  placeholder="MSKU1234567"
                  maxLength={11}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Weight */}
              <div>
                <label
                  htmlFor="weight_kg"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Weight (kg)
                </label>
                <input
                  type="number"
                  id="weight_kg"
                  name="weight_kg"
                  value={formData.weight_kg}
                  onChange={handleChange}
                  placeholder="1000"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Description (Full Width) */}
            <div>
              <label
                htmlFor="description"
                className="block text-xs font-medium text-slate-400 mb-1.5"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter shipment details..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium text-sm py-2.5 px-6 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creating Shipment...
                </>
              ) : (
                <>
                  <Package size={20} />
                  {isClient ? "Submit Booking" : "Create Shipment"}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
