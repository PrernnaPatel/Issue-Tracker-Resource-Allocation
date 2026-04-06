import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import {
  getTicketOptionsForDeptAdmin,
  createTicketOptionForDeptAdmin,
  updateTicketOptionForDeptAdmin,
  deleteTicketOptionForDeptAdmin,
} from "../../service/deptAuthService";
import { useDeptAuth } from "../../context/DeptAuthContext";

const TicketOptions = () => {
  const { deptAdmin } = useDeptAuth();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [editingId, setEditingId] = useState(null);

  const departmentName =
    typeof deptAdmin?.department === "object"
      ? deptAdmin?.department?.name
      : deptAdmin?.department || "";

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const result = await getTicketOptionsForDeptAdmin();
      if (result.success) {
        setOptions(result.options || []);
      } else {
        toast.error(result.message || "Failed to load ticket options");
      }
    } catch (error) {
      toast.error(error.message || "Failed to load ticket options");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ title: "", description: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Ticket title is required");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const result = await updateTicketOptionForDeptAdmin(editingId, {
          title: formData.title,
          description: formData.description,
        });
        if (!result.success) {
          toast.error(result.message || "Failed to update ticket option");
          return;
        }
        toast.success("Ticket option updated");
      } else {
        const result = await createTicketOptionForDeptAdmin({
          title: formData.title,
          description: formData.description,
        });
        if (!result.success) {
          toast.error(result.message || "Failed to add ticket option");
          return;
        }
        toast.success("Ticket option added");
      }
      resetForm();
      fetchOptions();
    } catch (error) {
      toast.error(error.message || "Failed to save ticket option");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (option) => {
    setEditingId(option._id);
    setFormData({
      title: option.title || "",
      description: option.description || "",
    });
  };

  const handleToggleStatus = async (option) => {
    try {
      const result = await updateTicketOptionForDeptAdmin(option._id, {
        isActive: !option.isActive,
      });
      if (!result.success) {
        toast.error(result.message || "Failed to update status");
        return;
      }
      setOptions((prev) =>
        prev.map((item) =>
          item._id === option._id
            ? { ...item, isActive: !option.isActive }
            : item
        )
      );
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleDelete = async (option) => {
    const confirmed = window.confirm(`Delete "${option.title}"?`);
    if (!confirmed) return;

    try {
      const result = await deleteTicketOptionForDeptAdmin(option._id);
      if (!result.success) {
        toast.error(result.message || "Failed to delete ticket option");
        return;
      }
      toast.success("Ticket option deleted");
      setOptions((prev) => prev.filter((item) => item._id !== option._id));
    } catch (error) {
      toast.error(error.message || "Failed to delete ticket option");
    }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Ticket Options {departmentName ? `- ${departmentName}` : ""}
        </h1>
        <p className="text-gray-600 mt-1">
          Manage ticket titles available to employees when raising a ticket.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {editingId ? "Edit Ticket Option" : "Add New Ticket Option"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ticket title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200"
              placeholder="Ticket title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
              placeholder="Description (optional)"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
            >
              <Plus size={16} />
              {saving ? "Saving..." : editingId ? "Update Option" : "Add Option"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Ticket Options</h3>
        </div>
        {loading ? (
          <div className="p-6 text-gray-500">Loading ticket options...</div>
        ) : options.length === 0 ? (
          <div className="p-6 text-gray-500">No ticket options added yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {options.map((option) => (
                  <tr key={option._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {option.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {option.description || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          option.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {option.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(option)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                          title={option.isActive ? "Deactivate" : "Activate"}
                        >
                          {option.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(option)}
                          className="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(option)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketOptions;
