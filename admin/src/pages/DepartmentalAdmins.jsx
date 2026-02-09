import { useState, useEffect } from 'react';
import { UserCog, Search, Plus, Mail, X, MapPin } from 'lucide-react';
import { createDepartmentalAdmin, getAllDepartments, getAllDepartmentalAdmins, getAvailableNetworkEngineerFloors, updateNetworkEngineerLocations } from '../service/adminAuthService';
import { toast } from 'react-toastify';

const DepartmentalAdmins = () => {
  const [departmentalAdmins, setDepartmentalAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: ''
  });
  const [availableAssignments, setAvailableAssignments] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedLabs, setSelectedLabs] = useState([]);
  const [buildingAssignments, setBuildingAssignments] = useState([]);
  const [viewLocationsModal, setViewLocationsModal] = useState({ open: false, locations: [], adminName: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAdminId, setEditAdminId] = useState(null);
  const [editAssignments, setEditAssignments] = useState([]);
  const [editAvailableAssignments, setEditAvailableAssignments] = useState([]);
  const [editSelectedBuilding, setEditSelectedBuilding] = useState('');
  const [editSelectedFloor, setEditSelectedFloor] = useState('');
  const [editSelectedLabs, setEditSelectedLabs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adminsData, departmentsData] = await Promise.all([
        getAllDepartmentalAdmins(),
        getAllDepartments()
      ]);
      console.log('Fetched Departmental Admins:', adminsData);
      setDepartmentalAdmins(adminsData || []);
      // Prefer departments that can resolve, but fall back to all if none are marked
      const allDepartments = departmentsData.depts || [];
      const resolvableDepartments = allDepartments.filter(dept => dept.canResolve);
      setDepartments(resolvableDepartments.length ? resolvableDepartments : allDepartments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentChange = async (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, department: value }));
    if (value.toLowerCase().includes('network engineer')) {
      try {
        const assignments = await getAvailableNetworkEngineerFloors();
        setAvailableAssignments(assignments);
        setSelectedBuilding('');
        setSelectedFloor('');
        setSelectedLabs([]);
        setBuildingAssignments([]);
      } catch {
        toast.error('Failed to fetch available buildings/floors');
        setAvailableAssignments([]);
      }
    } else {
      setAvailableAssignments([]);
      setSelectedBuilding('');
      setSelectedFloor('');
      setSelectedLabs([]);
      setBuildingAssignments([]);
    }
  };

  const handleBuildingChange = (e) => {
    setSelectedBuilding(e.target.value);
    setSelectedFloor('');
    setSelectedLabs([]);
  };

  const handleFloorChange = (e) => {
    setSelectedFloor(e.target.value);
    setSelectedLabs([]);
  };

  const handleLabSelection = (lab) => {
    setSelectedLabs(prev => {
      if (prev.includes(lab)) {
        return prev.filter(l => l !== lab);
      } else {
        return [...prev, lab];
      }
    });
  };

  const addBuildingAssignment = () => {
    if (!selectedBuilding || !selectedFloor) {
      toast.error('Please select both building and floor');
      return;
    }

    if (selectedLabs.length === 0) {
      toast.error('Please select at least one lab');
      return;
    }

    const buildingObj = availableAssignments.find(b => b.buildingId === selectedBuilding);
    if (!buildingObj) {
      toast.error('Invalid building selection');
      return;
    }

    // Check if this combination already exists
    const exists = buildingAssignments.some(
      assignment => assignment.buildingId === selectedBuilding && assignment.floor === selectedFloor
    );

    if (exists) {
      toast.error('This building-floor combination is already added');
      return;
    }

    const newAssignment = {
      buildingId: selectedBuilding,
      buildingName: buildingObj.buildingName,
      floor: selectedFloor,
      labs: [...selectedLabs]
    };

    setBuildingAssignments(prev => [...prev, newAssignment]);
    setSelectedBuilding('');
    setSelectedFloor('');
    setSelectedLabs([]);
  };

  const removeBuildingAssignment = (index) => {
    setBuildingAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let submitData = { ...formData };
      if (formData.department.toLowerCase().includes('network engineer')) {
        if (buildingAssignments.length === 0) {
          toast.error('Please add at least one building-floor assignment for Network Engineer');
          return;
        }
        submitData.buildingAssignments = buildingAssignments;
      }
      console.log(submitData);
      await createDepartmentalAdmin(submitData);
      toast.success('Departmental admin created successfully');
      setShowAddModal(false);
      setFormData({ name: '', email: '', department: '' });
      setAvailableAssignments([]);
      setSelectedBuilding('');
      setSelectedFloor('');
      setSelectedLabs([]);
      setBuildingAssignments([]);
      fetchData(); // Refresh the list after adding
    } catch (error) {
      toast.error(error.message || 'Failed to create departmental admin');
    }
  };

  const resetModal = () => {
    setShowAddModal(false);
    setFormData({ name: '', email: '', department: '' });
    setAvailableAssignments([]);
    setSelectedBuilding('');
    setSelectedFloor('');
    setSelectedLabs([]);
    setBuildingAssignments([]);
  };

  // Get available labs for selected building and floor
  const getAvailableLabs = () => {
    if (!selectedBuilding || !selectedFloor) return [];
    const buildingObj = availableAssignments.find(b => b.buildingId === selectedBuilding);
    if (!buildingObj) return [];
    const floorObj = buildingObj.availableFloors.find(f => f.floor === parseInt(selectedFloor));
    return floorObj ? floorObj.availableLabs : [];
  };

  const filteredAdmins = departmentalAdmins.filter(admin => {
    const matchesSearch =
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = !departmentFilter || admin.department?.name === departmentFilter;
    return matchesSearch && matchesDept;
  });

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4B2D87]"></div>
        </div>
    );
  }

  return (
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Departmental Admins</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-[#4B2D87] text-white rounded-lg hover:bg-[#5E3A9F] transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Add Admin
          </button>
        </div>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 maxw-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search admins..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept.name}>{dept.name}</option>
            ))}
          </select>
        </div>
        {/* Admins Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center">Loading admins...</td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center">No departmental admins found</td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{admin.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{admin.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{admin.department?.name || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        admin.isFirstLogin
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : 'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                        {admin.isFirstLogin ? 'First Login Pending' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {admin.department?.name?.toLowerCase().includes('network engineer') && admin.locations && admin.locations.length > 0 ? (
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors w-fit"
                            onClick={() => setViewLocationsModal({ open: true, locations: admin.locations, adminName: admin.name })}
                          >
                            View
                          </button>
                          <button
                            className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium hover:bg-yellow-200 transition-colors w-fit"
                            onClick={async () => {
                              setEditAdminId(admin._id);
                              setEditAssignments((admin.locations || []).map(loc => ({
                                buildingId: typeof loc.building === 'string' ? loc.building : loc.building?._id,
                                buildingName: typeof loc.building === 'string' ? loc.building : loc.building?.name,
                                floor: loc.floor,
                                labs: loc.labs || []
                              })));
                              setShowEditModal(true);
                              // Fetch available assignments for editing
                              try {
                                const assignments = await getAvailableNetworkEngineerFloors();
                                setEditAvailableAssignments(assignments);
                              } catch {
                                setEditAvailableAssignments([]);
                              }
                              setEditSelectedBuilding('');
                              setEditSelectedFloor('');
                              setEditSelectedLabs([]);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* View Locations Modal */}
        {viewLocationsModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
                onClick={() => setViewLocationsModal({ open: false, locations: [], adminName: '' })}
                title="Close"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{viewLocationsModal.adminName}'s Locations</h2>
              <table className="min-w-full text-xs border">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="px-3 py-2 border">Building</th>
                    <th className="px-3 py-2 border">Floor</th>
                    <th className="px-3 py-2 border">Labs</th>
                  </tr>
                </thead>
                <tbody>
                  {viewLocationsModal.locations.map((loc, idx) => {
                    const buildingName = typeof loc.building === 'string' ? loc.building : loc.building?.name || 'Unknown Building';
                    return (
                      <tr key={idx} className="even:bg-gray-50">
                        <td className="px-3 py-2 border font-medium">{buildingName}</td>
                        <td className="px-3 py-2 border">{loc.floor}</td>
                        <td className="px-3 py-2 border">{loc.labs && loc.labs.length > 0 ? loc.labs.join(', ') : <span className="text-gray-400">None</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Locations Modal */}
        {showEditModal && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Network Engineer Locations</h2>
              {/* Current Assignments */}
              {editAssignments.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Assignments:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {editAssignments.map((assignment, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                        title={`Labs: ${assignment.labs.join(', ')}`}
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-blue-800">
                            {assignment.buildingName} - F{assignment.floor}
                          </div>
                          <div className="text-xs text-blue-600">
                            {assignment.labs.length} lab{assignment.labs.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditAssignments(prev => prev.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                          title="Remove assignment"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Add New Assignment */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Assignment</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Building</label>
                    <select
                      value={editSelectedBuilding}
                      onChange={e => {
                        setEditSelectedBuilding(e.target.value);
                        setEditSelectedFloor('');
                        setEditSelectedLabs([]);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B2D87] focus:border-transparent"
                    >
                      <option value="">Select Building</option>
                      {editAvailableAssignments.map((b) => (
                        <option key={b.buildingId} value={b.buildingId}>{b.buildingName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Floor</label>
                    <select
                      value={editSelectedFloor}
                      onChange={e => {
                        setEditSelectedFloor(e.target.value);
                        setEditSelectedLabs([]);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B2D87] focus:border-transparent"
                      disabled={!editSelectedBuilding}
                    >
                      <option value="">Select Floor</option>
                      {editAvailableAssignments.find(b => b.buildingId === editSelectedBuilding)?.availableFloors.map(floor => (
                        <option key={floor.floor} value={floor.floor}>{floor.floor}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Labs Selection */}
                {editSelectedBuilding && editSelectedFloor && (
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-2">Select Labs:</label>
                    <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                      {(editAvailableAssignments.find(b => b.buildingId === editSelectedBuilding)?.availableFloors.find(f => f.floor === parseInt(editSelectedFloor))?.availableLabs || []).map((lab) => (
                        <label key={lab} className="flex items-center space-x-2 text-xs">
                          <input
                            type="checkbox"
                            checked={editSelectedLabs.includes(lab)}
                            onChange={() => setEditSelectedLabs(prev => prev.includes(lab) ? prev.filter(l => l !== lab) : [...prev, lab])}
                            className="rounded border-gray-300 text-[#4B2D87] focus:ring-[#4B2D87]"
                          />
                          <span>{lab}</span>
                        </label>
                      ))}
                    </div>
                    {editSelectedLabs.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Selected: {editSelectedLabs.join(', ')}
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!editSelectedBuilding || !editSelectedFloor) {
                      toast.error('Please select both building and floor');
                      return;
                    }
                    if (editSelectedLabs.length === 0) {
                      toast.error('Please select at least one lab');
                      return;
                    }
                    const buildingObj = editAvailableAssignments.find(b => b.buildingId === editSelectedBuilding);
                    if (!buildingObj) {
                      toast.error('Invalid building selection');
                      return;
                    }
                    const exists = editAssignments.some(
                      assignment => assignment.buildingId === editSelectedBuilding && assignment.floor === editSelectedFloor
                    );
                    if (exists) {
                      toast.error('This building-floor combination is already added');
                      return;
                    }
                    const newAssignment = {
                      buildingId: editSelectedBuilding,
                      buildingName: buildingObj.buildingName,
                      floor: editSelectedFloor,
                      labs: [...editSelectedLabs]
                    };
                    setEditAssignments(prev => [...prev, newAssignment]);
                    setEditSelectedBuilding('');
                    setEditSelectedFloor('');
                    setEditSelectedLabs([]);
                  }}
                  className="w-full px-3 py-2 text-sm bg-[#4B2D87] text-white rounded-lg hover:bg-[#5E3A9F] transition-colors"
                  disabled={!editSelectedBuilding || !editSelectedFloor || editSelectedLabs.length === 0}
                >
                  Add Assignment
                </button>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-[#4B2D87] text-white rounded-lg hover:bg-[#5E3A9F]"
                  onClick={async () => {
                    if (editAssignments.length === 0) {
                      toast.error('Please add at least one building-floor assignment');
                      return;
                    }
                    try {
                      // Prepare locations array for backend
                      const locations = editAssignments.map(a => ({
                        building: a.buildingId,
                        floor: parseInt(a.floor),
                        labs: a.labs
                      }));
                      await updateNetworkEngineerLocations(editAdminId, locations);
                      toast.success('Locations updated successfully');
                      setShowEditModal(false);
                      setEditAdminId(null);
                      setEditAssignments([]);
                      setEditAvailableAssignments([]);
                      setEditSelectedBuilding('');
                      setEditSelectedFloor('');
                      setEditSelectedLabs([]);
                      fetchData();
                    } catch (error) {
                      toast.error(error.message || 'Failed to update locations');
                    }
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Add Departmental Admin</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B2D87] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B2D87] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={handleDepartmentChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B2D87] focus:border-transparent"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show building/floor assignment section only for Network Engineer */}
                {formData.department.toLowerCase().includes('network engineer') && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Buildings</h3>
                    
                    {/* Current Assignments */}
                    {buildingAssignments.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Assignments:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {buildingAssignments.map((assignment, index) => (
                            <div 
                              key={index} 
                              className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                              title={`Labs: ${assignment.labs.join(', ')}`}
                            >
                              <div className="flex-1">
                                <div className="text-sm font-medium text-blue-800">
                                  {assignment.buildingName} - F{assignment.floor}
                                </div>
                                <div className="text-xs text-blue-600">
                                  {assignment.labs.length} lab{assignment.labs.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeBuildingAssignment(index)}
                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                                title="Remove assignment"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add New Assignment */}
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Assignment</h4>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Building</label>
                          <select
                            value={selectedBuilding}
                            onChange={handleBuildingChange}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B2D87] focus:border-transparent"
                          >
                            <option value="">Select Building</option>
                            {availableAssignments.map((b) => (
                              <option key={b.buildingId} value={b.buildingId}>{b.buildingName}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Floor</label>
                          <select
                            value={selectedFloor}
                            onChange={handleFloorChange}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B2D87] focus:border-transparent"
                            disabled={!selectedBuilding}
                          >
                            <option value="">Select Floor</option>
                            {availableAssignments.find(b => b.buildingId === selectedBuilding)?.availableFloors.map(floor => (
                              <option key={floor.floor} value={floor.floor}>{floor.floor}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Labs Selection */}
                      {selectedBuilding && selectedFloor && (
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-600 mb-2">Select Labs:</label>
                          <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                            {getAvailableLabs().map((lab) => (
                              <label key={lab} className="flex items-center space-x-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={selectedLabs.includes(lab)}
                                  onChange={() => handleLabSelection(lab)}
                                  className="rounded border-gray-300 text-[#4B2D87] focus:ring-[#4B2D87]"
                                />
                                <span>{lab}</span>
                              </label>
                            ))}
                          </div>
                          {selectedLabs.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Selected: {selectedLabs.join(', ')}
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={addBuildingAssignment}
                        className="w-full px-3 py-2 text-sm bg-[#4B2D87] text-white rounded-lg hover:bg-[#5E3A9F] transition-colors"
                        disabled={!selectedBuilding || !selectedFloor || selectedLabs.length === 0}
                      >
                        Add Assignment
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#4B2D87] text-white rounded-lg hover:bg-[#5E3A9F]"
                  >
                    Add Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>  
  );
};

export default DepartmentalAdmins;
