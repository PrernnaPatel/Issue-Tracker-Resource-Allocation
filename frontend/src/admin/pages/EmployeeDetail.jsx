import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building2, 
  Ticket, 
  MapPin,
  User
} from 'lucide-react';
import { getEmployeeDetails } from '../service/adminAuthService';
import { toast } from 'react-toastify';

const EmployeeDetail = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [priorityFilter, setPriorityFilter] = useState('');
  const ticketsPerPage = 3;

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      try {
        const data = await getEmployeeDetails(id);
        setEmployee(data); // data now contains both employee details and tickets
      } catch (error) {
        console.error('Error fetching employee details:', error);
        toast.error(error.message || 'Failed to fetch employee details');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeDetails();
  }, [id]);

  // Get current tickets with null check for employee
  const filteredTickets = employee?.tickets?.filter(ticket => 
    priorityFilter ? ticket.priority === priorityFilter : true
  ) || [];

  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Reset to first page when filter changes
  const handlePriorityFilter = (priority) => {
    setPriorityFilter(priority);
    setCurrentPage(1);
  };

  if (loading || !employee) {
    return (
        <div className="p-6">
          <div className="text-center">Loading employee details...</div>
        </div>
    );
  }

  return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <Link
            to="/admin/employee"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Employees
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 mx-auto mb-4">
                {employee.profile_image ? (
                  <img
                    src={employee.profile_image}
                    alt={employee.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-purple-100 flex items-center justify-center">
                    <User size={40} className="text-purple-600" />
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{employee.name}</h2>
              <p className="text-gray-500">
                {typeof employee.department === 'object'
                  ? employee.department?.name || 'No Department'
                  : employee.department || 'No Department'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-sm text-gray-900">{employee.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Contact</p>
                  <p className="text-sm text-gray-900">{employee.contact_no || 'Not Available'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Location</p>
                  <p className="text-sm text-gray-900">
                    Building: {typeof employee.building === 'object'
                      ? employee.building?.name || 'Not Assigned'
                      : employee.building || 'Not Assigned'}<br />
                    Floor: {employee.floor || 'Not Assigned'}<br />
                    Lab No: {employee.lab_no || 'Not Assigned'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tickets Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Issued Tickets ({filteredTickets.length})
                </h3>
                <div className="flex gap-2">
                  <select 
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1"
                    value={priorityFilter}
                    onChange={(e) => handlePriorityFilter(e.target.value)}
                  >
                    <option value="">All Priorities</option>
                    <option value="low">Low Priority</option>
                    <option value="normal">Normal Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {currentTickets.length > 0 ? (
                  currentTickets.map((ticket) => (
                    <div key={ticket._id} className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{ticket.title}</h4>
                          <span className="text-xs text-gray-500">From: {ticket.from_department}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Priority Badge */}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                            ticket.priority === 'normal' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                          </span>
                          {/* Status Badge */}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                            ticket.status === 'assigned' ? 'bg-purple-100 text-purple-800' :
                            ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            ticket.status === 'revoked' ? 'bg-red-100 text-red-800' :
                            ticket.status === 'closed' ? 'bg-gray-100 text-gray-800' :  
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{ticket.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-4">
                          <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                          <span>
                            To: {typeof ticket.to_department === 'object'
                              ? ticket.to_department?.name || 'Unknown Department'
                              : ticket.to_department || 'Unknown Department'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    {priorityFilter 
                      ? `No ${priorityFilter} priority tickets found` 
                      : 'No tickets issued by this employee'}
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {filteredTickets.length > ticketsPerPage && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Showing {indexOfFirstTicket + 1} to {Math.min(indexOfLastTicket, filteredTickets.length)} of {filteredTickets.length} tickets
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 border border-gray-300 rounded-md text-sm ${
                          currentPage === 1 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      {/* Page Numbers */}
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => handlePageChange(i + 1)}
                          className={`px-3 py-1 border border-gray-300 rounded-md text-sm ${
                            currentPage === i + 1
                              ? 'bg-[#4B2D87] text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 border border-gray-300 rounded-md text-sm ${
                          currentPage === totalPages 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
};

export default EmployeeDetail;