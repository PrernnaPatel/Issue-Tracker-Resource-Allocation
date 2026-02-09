import { useState, useEffect } from 'react';
import { Building2, Search, UserPlus, Plus, Pencil, Trash2 } from 'lucide-react';
import { getAllDepartments, addDepartment, updateDepartment, deleteDepartment } from '../service/adminAuthService';
import { toast } from 'react-toastify';


const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    canResolve: false
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await getAllDepartments();
      console.log('Departments fetched:', data);
      setDepartments(data?.depts || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewEmployees = () => {
    // Add navigation to department employees page
    // You can implement this later
  };

  const getColorTheme = (index) => {
    // Array of color combinations
    const colors = [
      { color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-200' },
      { color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-200' },
      { color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' },
      { color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-200' },
      { color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' },
      { color: 'text-indigo-600', bgColor: 'bg-indigo-100', borderColor: 'border-indigo-200' },
      { color: 'text-pink-600', bgColor: 'bg-pink-100', borderColor: 'border-pink-200' },
      { color: 'text-teal-600', bgColor: 'bg-teal-100', borderColor: 'border-teal-200' }
    ];

    // Use modulo to cycle through colors if there are more departments than colors
    return colors[index % colors.length];
  };

  const handleAddEdit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        await addDepartment(formData);
        toast.success('Department added successfully');
      } else {
        await updateDepartment(selectedDepartment._id, formData);
        toast.success('Department updated successfully');
      }
      setIsModalOpen(false);
      setFormData({ name: '', description: '', canResolve: false });
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (deptId) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    
    try {
      await deleteDepartment(deptId);
      toast.success('Department deleted successfully');
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete department');
    }
  };

  const openModal = (mode, dept = null) => {
    setModalMode(mode);
    setSelectedDepartment(dept);
    if (dept) {
      setFormData({
        name: dept.name,
        description: dept.description || '',
        canResolve: dept.canResolve || false
      });
    } else {
      setFormData({ name: '', description: '', canResolve: false });
    }
    setIsModalOpen(true);
  };

  return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Departments</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search departments..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => openModal('add')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700"
            >
              <Plus size={20} />
              Add Department
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading departments...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredDepartments.map((dept, index) => {
              const theme = getColorTheme(index);
              
              return (
                <div
                  key={dept._id}
                  className={`${theme.bgColor} ${theme.borderColor} border rounded-xl p-6 transition-all duration-300 hover:shadow-md`}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 rounded-lg bg-white ${theme.color}`}>
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{dept.name}</h3>
                      <p className={`text-sm ${theme.color}`}>Department</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className={theme.color}>Total Employees</span>
                      <span className="font-semibold">{dept.employeeCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={theme.color}>Can Resolve</span>
                      <span className="font-semibold">{dept.canResolve ? 'Yes' : 'No'}</span>
                    </div>
                    <button
                      onClick={() => handleViewEmployees(dept._id)}
                      className={`w-full bg-white bg-opacity-50 hover:bg-opacity-75 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${theme.color}`}
                    >
                      <UserPlus size={16} />
                      View Employees
                    </button>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => openModal('edit', dept)}
                      className="text-blue-600 hover:underline"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(dept._id)}
                      className="text-red-600 hover:underline"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Department Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold mb-4">
                {modalMode === 'add' ? 'Add New Department' : 'Edit Department'}
              </h2>
              <form onSubmit={handleAddEdit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department Name
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="canResolve"
                      type="checkbox"
                      checked={formData.canResolve}
                      onChange={e => setFormData({ ...formData, canResolve: e.target.checked })}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="canResolve" className="text-sm font-medium text-gray-700">
                      Can Resolve
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      {modalMode === 'add' ? 'Add Department' : 'Update Department'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
};

export default Departments;