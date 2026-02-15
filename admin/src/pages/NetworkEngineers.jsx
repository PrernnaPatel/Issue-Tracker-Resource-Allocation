import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  createDepartmentalAdmin,
  deleteDepartmentalAdmin,
  getAllBuildings,
  getAllDepartmentalAdmins,
  updateNetworkEngineerLocations,
} from "../service/adminAuthService";
import { toast } from "react-toastify";

const IT_DEPT_REGEX = /^it(\s+department)?$/i;

const createEmptyLocation = () => ({
  buildingId: "",
  selectedFloors: [],
  selectedLabs: [],
});

const createEmptyAssignment = () => ({
  buildingId: "",
  floor: "",
  labs: [],
});

const NetworkEngineers = () => {
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAssignments, setEditAssignments] = useState([createEmptyAssignment()]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    itDepartmentAdminId: "",
    locations: [createEmptyLocation()],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allAdmins, allBuildings] = await Promise.all([
        getAllDepartmentalAdmins(),
        getAllBuildings(),
      ]);
      setAdmins(allAdmins || []);
      setBuildings(allBuildings || []);
    } catch (error) {
      toast.error(error.message || "Failed to load network engineers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const networkEngineers = useMemo(
    () =>
      admins.filter((admin) =>
        admin.department?.name?.toLowerCase().includes("network engineer")
      ),
    [admins]
  );

  const itDeptAdmins = useMemo(
    () =>
      admins.filter((admin) => IT_DEPT_REGEX.test(admin.department?.name || "")),
    [admins]
  );

  const getBuildingById = (buildingId) =>
    buildings.find((building) => String(building._id) === String(buildingId));

  const getFloorsForBuilding = (buildingId) => getBuildingById(buildingId)?.floors || [];

  const getLabsForFloors = (buildingId, selectedFloors) => {
    const floors = getFloorsForBuilding(buildingId);
    const labs = new Set();
    floors.forEach((floorObj) => {
      if (selectedFloors.includes(String(floorObj.floor))) {
        (floorObj.labs || []).forEach((lab) => labs.add(lab));
      }
    });
    return Array.from(labs);
  };

  const getLabsForFloor = (buildingId, floor) => {
    const floors = getFloorsForBuilding(buildingId);
    const floorObj = floors.find((item) => String(item.floor) === String(floor));
    return floorObj?.labs || [];
  };

  const updateLocation = (index, updater) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.map((loc, i) =>
        i === index ? { ...loc, ...updater } : loc
      ),
    }));
  };

  const toggleFloor = (index, floor) => {
    const location = formData.locations[index];
    const floorValue = String(floor);
    const selectedFloors = location.selectedFloors.includes(floorValue)
      ? location.selectedFloors.filter((f) => f !== floorValue)
      : [...location.selectedFloors, floorValue];
    const validLabs = getLabsForFloors(location.buildingId, selectedFloors);
    const selectedLabs = location.selectedLabs.filter((lab) => validLabs.includes(lab));
    updateLocation(index, { selectedFloors, selectedLabs });
  };

  const toggleLab = (index, lab) => {
    const location = formData.locations[index];
    const selectedLabs = location.selectedLabs.includes(lab)
      ? location.selectedLabs.filter((value) => value !== lab)
      : [...location.selectedLabs, lab];
    updateLocation(index, { selectedLabs });
  };

  const addLocation = () => {
    setFormData((prev) => ({
      ...prev,
      locations: [...prev.locations, createEmptyLocation()],
    }));
  };

  const removeLocation = (index) => {
    if (formData.locations.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      itDepartmentAdminId: "",
      locations: [createEmptyLocation()],
    });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!formData.itDepartmentAdminId) {
      toast.error("Please select IT Departmental Admin");
      return;
    }

    const payloadLocations = [];
    for (const loc of formData.locations) {
      if (!loc.buildingId || loc.selectedFloors.length === 0 || loc.selectedLabs.length === 0) {
        toast.error("Each location needs building, floors, and labs");
        return;
      }
      const building = getBuildingById(loc.buildingId);
      if (!building) {
        toast.error("Invalid building selected");
        return;
      }

      loc.selectedFloors.forEach((floorValue) => {
        const floorObj = (building.floors || []).find(
          (entry) => String(entry.floor) === String(floorValue)
        );
        if (!floorObj) return;
        const labsForFloor = loc.selectedLabs.filter((lab) =>
          (floorObj.labs || []).includes(lab)
        );
        if (labsForFloor.length > 0) {
          payloadLocations.push({
            building: building.name,
            floor: Number(floorValue),
            labs: labsForFloor,
          });
        }
      });
    }

    if (payloadLocations.length === 0) {
      toast.error("No valid floor/lab assignment found");
      return;
    }

    try {
      setSubmitting(true);
      await createDepartmentalAdmin({
        name: formData.name,
        email: formData.email,
        department: "Network Engineer",
        itDepartmentAdminId: formData.itDepartmentAdminId,
        locations: payloadLocations,
      });
      toast.success("Network Engineer created successfully");
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to create network engineer");
    } finally {
      setSubmitting(false);
    }
  };

  const groupedLocationsText = (locations = []) => {
    if (!Array.isArray(locations) || locations.length === 0) return "-";
    const grouped = new Map();
    locations.forEach((loc) => {
      const buildingName =
        typeof loc.building === "object" ? loc.building.name : String(loc.building);
      if (!grouped.has(buildingName)) {
        grouped.set(buildingName, { floors: new Set(), labs: new Set() });
      }
      grouped.get(buildingName).floors.add(loc.floor);
      (loc.labs || []).forEach((lab) => grouped.get(buildingName).labs.add(lab));
    });

    return Array.from(grouped.entries())
      .map(([buildingName, data]) => {
        const floors = Array.from(data.floors).sort((a, b) => Number(a) - Number(b));
        const labs = Array.from(data.labs);
        return `${buildingName} - Floors: ${floors.join(", ")} | Labs: ${labs.join(", ")}`;
      })
      .join(" ; ");
  };

  const filteredEngineers = useMemo(() => {
    return networkEngineers.filter((engineer) => {
      const matchesSearch =
        engineer.name.toLowerCase().includes(search.toLowerCase()) ||
        engineer.email.toLowerCase().includes(search.toLowerCase());
      const matchesBuilding =
        !buildingFilter ||
        (engineer.locations || []).some((loc) => {
          const buildingName =
            typeof loc.building === "object" ? loc.building.name : String(loc.building);
          return buildingName === buildingFilter;
        });
      return matchesSearch && matchesBuilding;
    });
  }, [networkEngineers, search, buildingFilter]);

  const openViewModal = (engineer) => {
    setSelectedEngineer(engineer);
    setShowViewModal(true);
  };

  const openEditModal = (engineer) => {
    const currentAssignments = (engineer.locations || []).map((loc) => ({
      buildingId:
        typeof loc.building === "object" ? String(loc.building._id || "") : String(loc.building),
      floor: String(loc.floor ?? ""),
      labs: Array.isArray(loc.labs) ? [...loc.labs] : [],
    }));
    setSelectedEngineer(engineer);
    setEditAssignments(currentAssignments.length > 0 ? currentAssignments : [createEmptyAssignment()]);
    setShowEditModal(true);
  };

  const updateEditAssignment = (index, changes) => {
    setEditAssignments((prev) =>
      prev.map((assignment, idx) => (idx === index ? { ...assignment, ...changes } : assignment))
    );
  };

  const removeEditAssignment = (index) => {
    setEditAssignments((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const addEditAssignment = () => {
    setEditAssignments((prev) => [...prev, createEmptyAssignment()]);
  };

  const handleDelete = async (engineer) => {
    const confirmed = window.confirm(`Delete ${engineer.name}?`);
    if (!confirmed) return;

    try {
      await deleteDepartmentalAdmin(engineer._id);
      toast.success("Network engineer deleted successfully");
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to delete network engineer");
    }
  };

  const handleEditSave = async () => {
    if (!selectedEngineer?._id) return;

    const invalidAssignment = editAssignments.some(
      (item) => !item.buildingId || !item.floor || !Array.isArray(item.labs) || item.labs.length === 0
    );
    if (invalidAssignment) {
      toast.error("Each assignment needs building, floor, and at least one lab");
      return;
    }

    const payloadLocations = editAssignments.map((item) => ({
      building: item.buildingId,
      floor: Number(item.floor),
      labs: item.labs,
    }));

    try {
      setEditSubmitting(true);
      await updateNetworkEngineerLocations(selectedEngineer._id, payloadLocations);
      toast.success("Network engineer updated successfully");
      setShowEditModal(false);
      setSelectedEngineer(null);
      setEditAssignments([createEmptyAssignment()]);
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to update network engineer");
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 rounded-full border-b-2 border-[#5b21b6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Network Engineers</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5b21b6] text-white hover:bg-[#4c1d95]"
        >
          <Plus size={18} />
          Add Network Engineer
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg min-w-[220px]"
        >
          <option value="">All Buildings</option>
          {buildings.map((building) => (
            <option key={building._id} value={building.name}>
              {building.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IT Dept Admin</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Locations</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEngineers.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  No network engineers found
                </td>
              </tr>
            ) : (
              filteredEngineers.map((engineer) => (
                <tr key={engineer._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{engineer.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{engineer.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {engineer.itDepartmentAdmin
                      ? `${engineer.itDepartmentAdmin.name} (${engineer.itDepartmentAdmin.email})`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{groupedLocationsText(engineer.locations)}</td>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(engineer)}
                        className="p-2 rounded-md text-blue-600 hover:bg-blue-50"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(engineer)}
                        className="p-2 rounded-md text-amber-600 hover:bg-amber-50"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(engineer)}
                        className="p-2 rounded-md text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showViewModal && selectedEngineer && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">View Network Engineer</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedEngineer(null);
                }}
                className="p-2 rounded hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm text-gray-800">
              <p><span className="font-semibold">Name:</span> {selectedEngineer.name}</p>
              <p><span className="font-semibold">Email:</span> {selectedEngineer.email}</p>
              <p>
                <span className="font-semibold">IT Dept Admin:</span>{" "}
                {selectedEngineer.itDepartmentAdmin
                  ? `${selectedEngineer.itDepartmentAdmin.name} (${selectedEngineer.itDepartmentAdmin.email})`
                  : "-"}
              </p>
              <p><span className="font-semibold">Locations:</span> {groupedLocationsText(selectedEngineer.locations)}</p>
              <p>
                <span className="font-semibold">Status:</span>{" "}
                {selectedEngineer.isFirstLogin ? "Pending" : "Active"}
              </p>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedEngineer && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Edit Network Engineer</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedEngineer(null);
                  setEditAssignments([createEmptyAssignment()]);
                }}
                className="p-2 rounded hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input value={selectedEngineer.name} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input value={selectedEngineer.email} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Assignments *</label>
                  <button
                    type="button"
                    onClick={addEditAssignment}
                    className="text-sm font-medium text-[#5b21b6] hover:text-[#4c1d95]"
                  >
                    + Add Assignment
                  </button>
                </div>

                <div className="space-y-3">
                  {editAssignments.map((assignment, index) => {
                    const floors = getFloorsForBuilding(assignment.buildingId);
                    const labs = getLabsForFloor(assignment.buildingId, assignment.floor);
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-800">Assignment {index + 1}</h4>
                          {editAssignments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEditAssignment(index)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Building *</label>
                            <select
                              value={assignment.buildingId}
                              onChange={(e) =>
                                updateEditAssignment(index, {
                                  buildingId: e.target.value,
                                  floor: "",
                                  labs: [],
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                              <option value="">Select Building</option>
                              {buildings.map((building) => (
                                <option key={building._id} value={building._id}>
                                  {building.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Floor *</label>
                            <select
                              value={assignment.floor}
                              onChange={(e) =>
                                updateEditAssignment(index, {
                                  floor: e.target.value,
                                  labs: [],
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              disabled={!assignment.buildingId}
                            >
                              <option value="">Select Floor</option>
                              {floors.map((floorObj) => (
                                <option key={floorObj.floor} value={floorObj.floor}>
                                  Floor {floorObj.floor}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {assignment.floor && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Labs * (Select one or more)
                            </label>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 border border-gray-200 rounded p-2 bg-white">
                              {labs.map((lab) => (
                                <label key={`${index}-${lab}`} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={assignment.labs.includes(lab)}
                                    onChange={() =>
                                      updateEditAssignment(index, {
                                        labs: assignment.labs.includes(lab)
                                          ? assignment.labs.filter((value) => value !== lab)
                                          : [...assignment.labs, lab],
                                      })
                                    }
                                  />
                                  {lab}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEngineer(null);
                    setEditAssignments([createEmptyAssignment()]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={editSubmitting}
                  onClick={handleEditSave}
                  className="px-4 py-2 bg-[#5b21b6] text-white rounded-lg hover:bg-[#4c1d95] disabled:bg-gray-400"
                >
                  {editSubmitting ? "Updating..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Add Network Engineer</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-2 rounded hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IT Departmental Admin *
                </label>
                <select
                  value={formData.itDepartmentAdminId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      itDepartmentAdminId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select IT Departmental Admin</option>
                  {itDeptAdmins.map((admin) => (
                    <option key={admin._id} value={admin._id}>
                      {admin.name} ({admin.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Locations *</label>
                  <button
                    type="button"
                    onClick={addLocation}
                    className="text-sm font-medium text-[#5b21b6] hover:text-[#4c1d95]"
                  >
                    + Add Location
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.locations.map((location, index) => {
                    const buildingFloors = getFloorsForBuilding(location.buildingId);
                    const availableLabs = getLabsForFloors(
                      location.buildingId,
                      location.selectedFloors
                    );

                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-800">Location {index + 1}</h4>
                          {formData.locations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLocation(index)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Building *
                          </label>
                          <select
                            value={location.buildingId}
                            onChange={(e) =>
                              updateLocation(index, {
                                buildingId: e.target.value,
                                selectedFloors: [],
                                selectedLabs: [],
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="">Select Building</option>
                            {buildings.map((building) => (
                              <option key={building._id} value={building._id}>
                                {building.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {location.buildingId && (
                          <>
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Floors * (Select one or more)
                              </label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border border-gray-200 rounded p-2 bg-white">
                                {buildingFloors.map((floorObj) => (
                                  <label key={floorObj.floor} className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={location.selectedFloors.includes(String(floorObj.floor))}
                                      onChange={() => toggleFloor(index, floorObj.floor)}
                                    />
                                    Floor {floorObj.floor}
                                  </label>
                                ))}
                              </div>
                            </div>

                            {location.selectedFloors.length > 0 && (
                              <div className="mb-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Labs * (Select one or more)
                                </label>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 border border-gray-200 rounded p-2 bg-white">
                                  {availableLabs.map((lab) => (
                                    <label key={lab} className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={location.selectedLabs.includes(lab)}
                                        onChange={() => toggleLab(index, lab)}
                                      />
                                      {lab}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#5b21b6] text-white rounded-lg hover:bg-[#4c1d95] disabled:bg-gray-400"
                >
                  {submitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkEngineers;
