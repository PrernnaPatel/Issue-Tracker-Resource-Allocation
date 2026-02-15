import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "react-toastify";
import { getNetworkEngineersForDeptAdmin } from "../../service/deptAuthService";

const NetworkEngineers = () => {
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState([]);
  const [search, setSearch] = useState("");

  const fetchEngineers = async () => {
    try {
      setLoading(true);
      const result = await getNetworkEngineersForDeptAdmin();
      if (!result.success) {
        toast.error(result.message || "Failed to fetch network engineers");
        setEngineers([]);
        return;
      }
      setEngineers(result.engineers || []);
    } catch (error) {
      toast.error(error.message || "Failed to fetch network engineers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEngineers();
  }, []);

  const filteredEngineers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return engineers;
    return engineers.filter(
      (engineer) =>
        engineer.name?.toLowerCase().includes(query) ||
        engineer.email?.toLowerCase().includes(query)
    );
  }, [engineers, search]);

  const locationText = (locations = []) => {
    if (!Array.isArray(locations) || locations.length === 0) return "-";
    return locations
      .map((loc) => {
        const buildingName =
          typeof loc.building === "object" ? loc.building?.name : loc.building;
        const labs = Array.isArray(loc.labs) ? loc.labs.join(", ") : "";
        return `${buildingName} - Floor ${loc.floor} | Labs: ${labs}`;
      })
      .join(" ; ");
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Network Engineers</h1>
        <p className="text-gray-600 mt-1">
          View network engineers mapped to your IT department.
        </p>
      </div>

      <div className="relative max-w-xl mb-4">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Locations
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                  Loading network engineers...
                </td>
              </tr>
            ) : filteredEngineers.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                  No network engineers found.
                </td>
              </tr>
            ) : (
              filteredEngineers.map((engineer) => (
                <tr key={engineer._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {engineer.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {engineer.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {locationText(engineer.locations)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        engineer.isFirstLogin
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {engineer.isFirstLogin ? "Pending" : "Active"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NetworkEngineers;
