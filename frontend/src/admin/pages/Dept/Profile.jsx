import { useEffect, useState } from "react";
import { Building2, Mail, User, ShieldCheck, Briefcase, Layers } from "lucide-react";
import { getLoggedInDepartmentalAdmin } from "../../service/deptAuthService";
import { toast } from "react-toastify";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const result = await getLoggedInDepartmentalAdmin();
        if (result.success) {
          setAdmin(result.data?.admin || result.data);
        } else {
          toast.error(result.message || "Failed to load profile");
        }
      } catch (error) {
        toast.error(error.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 rounded-full border-b-2 border-blue-600 animate-spin" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-gray-600">Profile not available.</p>
      </div>
    );
  }

  const rawDepartmentName =
    typeof admin.department === "object" ? admin.department?.name : admin.department;
  const itAdminDepartmentName =
    typeof admin.itDepartmentAdmin?.department === "object"
      ? admin.itDepartmentAdmin?.department?.name
      : admin.itDepartmentAdmin?.department;
  const departmentName = admin.isNetworkEngineer
    ? itAdminDepartmentName || rawDepartmentName
    : rawDepartmentName;
  const roleLabel = "Employee";
  const designationLabel = admin.isNetworkEngineer ? "Network Engineer" : "Departmental Admin";
  const itAdminName =
    typeof admin.itDepartmentAdmin === "object"
      ? `${admin.itDepartmentAdmin?.name || "IT Admin"} (${admin.itDepartmentAdmin?.email || ""})`
      : admin.itDepartmentAdmin;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">View your account details.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="text-blue-600" size={28} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{admin.name}</h2>
            <p className="text-gray-500">{departmentName}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <Mail className="text-gray-500" size={18} />
            <div>
              <p className="text-xs uppercase text-gray-400">Email</p>
              <p className="text-sm font-medium text-gray-900">{admin.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <ShieldCheck className="text-gray-500" size={18} />
            <div>
              <p className="text-xs uppercase text-gray-400">Role</p>
              <p className="text-sm font-medium text-gray-900">{roleLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <Briefcase className="text-gray-500" size={18} />
            <div>
              <p className="text-xs uppercase text-gray-400">Designation</p>
              <p className="text-sm font-medium text-gray-900">
                {designationLabel || "Not assigned"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <Building2 className="text-gray-500" size={18} />
            <div>
              <p className="text-xs uppercase text-gray-400">Department</p>
              <p className="text-sm font-medium text-gray-900">
                {departmentName || "Not assigned"}
              </p>
            </div>
          </div>
          {admin.isNetworkEngineer && (
            <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
              <User className="text-gray-500" size={18} />
              <div>
                <p className="text-xs uppercase text-gray-400">
                  Working Under IT Departmental Admin
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {itAdminName || "Not assigned"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Layers size={16} className="text-gray-500" />
            Assigned Locations (Building, Floor, Lab)
          </h3>
          {(admin.locations || []).length === 0 ? (
            <p className="text-sm text-gray-500">No locations assigned.</p>
          ) : (
            <div className="space-y-4">
              {(admin.locations || []).map((loc, idx) => (
                <div
                  key={`${loc.building?._id || loc.building}-${idx}`}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs uppercase text-blue-500 font-semibold mb-1">
                        Building
                      </p>
                      <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                        <Building2 size={14} />
                        {typeof loc.building === "object" ? loc.building?.name : loc.building}
                      </p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs uppercase text-amber-500 font-semibold mb-1">
                        Floor
                      </p>
                      <p className="text-sm font-medium text-amber-800">
                        {loc.floor}
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs uppercase text-emerald-500 font-semibold mb-1">
                        Labs
                      </p>
                      <p className="text-sm font-medium text-emerald-800">
                        {(loc.labs || []).join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
