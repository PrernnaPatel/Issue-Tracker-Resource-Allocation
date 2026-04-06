import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { getAllEmployees } from '../service/adminAuthService';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router-dom';

const Employee = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 10;

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Reset page to 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const departmentIdFilter = searchParams.get('departmentId') || '';
  const departmentNameFilter = searchParams.get('departmentName') || '';

  const employeesByDepartment = employees.filter((emp) => {
    if (!departmentIdFilter) return true;
    const employeeDeptId =
      typeof emp.department === 'object' ? emp.department?._id : '';
    return String(employeeDeptId) === String(departmentIdFilter);
  });

  // Filter employees by search query
  const filteredEmployees = employeesByDepartment.filter(emp => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const locationText = [
      typeof emp.building === 'object' ? emp.building?.name : emp.building,
      emp.floor ? `Floor ${emp.floor}` : '',
      emp.lab_no ? `Lab ${emp.lab_no}` : '',
    ].filter(Boolean).join(' ');
    return (
      emp.name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      (typeof emp.department === 'object'
        ? (emp.department?.name || '').toLowerCase().includes(query)
        : (emp.department || '').toLowerCase().includes(query)) ||
      String(emp.contact_no || '').toLowerCase().includes(query) ||
      locationText.toLowerCase().includes(query)
    );
  });

  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await getAllEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error(error.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  // Add this handler
  const handleRowClick = (employeeId) => {
    navigate(`/admin/employee/${employeeId}`);
  };

  const getLocationText = (employee) => {
    const buildingName =
      typeof employee.building === 'object'
        ? employee.building?.name
        : employee.building;
    const floorText = employee.floor ? `Floor ${employee.floor}` : '';
    const labText = employee.lab_no ? `Lab ${employee.lab_no}` : '';
    return [buildingName, floorText, labText].filter(Boolean).join(', ') || 'Not Available';
  };

  const getRegisteredOnText = (employee) => {
    if (!employee.createdAt) return 'Not Available';
    const date = new Date(employee.createdAt);
    if (Number.isNaN(date.getTime())) return 'Not Available';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {departmentNameFilter ? `${departmentNameFilter} Employees` : 'Employees'}
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered On</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      Loading employees...
                    </td>
                  </tr>
                ) : currentEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      No employees found
                    </td>
                  </tr>
                ) : (
                  currentEmployees.map((employee) => (
                    <tr 
                      key={employee._id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(employee._id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-purple-600 font-medium text-sm">
                                {employee.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getLocationText(employee)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {typeof employee.department === 'object'
                          ? employee.department?.name || 'Not Assigned'
                          : employee.department || 'Not Assigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.contact_no || 'Not Available'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getRegisteredOnText(employee)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {indexOfFirstEmployee + 1} to {Math.min(indexOfLastEmployee, filteredEmployees.length)} of {filteredEmployees.length} entries
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredEmployees.length / employeesPerPage)))}
                  disabled={currentPage === Math.ceil(filteredEmployees.length / employeesPerPage)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default Employee;
