import { useState, useEffect } from 'react';
import { Search, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Add this import
import { getAllTickets, getAllDepartments } from '../service/adminAuthService';
import { toast } from 'react-toastify';
const Tickets = () => {
  const navigate = useNavigate(); // Add this hook
  const [tickets, setTickets] = useState({});
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentDepartment, setCurrentDepartment] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 5;

  const getColorTheme = (index) => {
    const colors = [
      { color: 'text-blue-600', bgColor: 'bg-blue-100' },
      { color: 'text-purple-600', bgColor: 'bg-purple-100' },
      { color: 'text-green-600', bgColor: 'bg-green-100' },
      { color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
      { color: 'text-red-600', bgColor: 'bg-red-100' },
      { color: 'text-indigo-600', bgColor: 'bg-indigo-100' }
    ];
    return colors[index % colors.length];
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Reset page when filters or department change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, currentDepartment]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [ticketsData, departmentsData] = await Promise.all([
        getAllTickets(),
        getAllDepartments()
      ]);

      // Create tickets object grouped by department
      const groupedTickets = {};
      departmentsData.depts.forEach(dept => {
        groupedTickets[dept.name] = ticketsData.filter(
          ticket => ticket.to_department.name === dept.name
        );
      });

      setDepartments(departmentsData.depts);
      setTickets(groupedTickets);
      setCurrentDepartment(departmentsData.depts[0]?.name || '');
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const sortTickets = (tickets) => {
    return [...tickets].sort((a, b) => {
      if (sortField === 'createdAt') {
        return sortDirection === 'desc' 
          ? new Date(b.createdAt) - new Date(a.createdAt)
          : new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortField === 'title') {
        return sortDirection === 'desc'
          ? b.title.localeCompare(a.title)
          : a.title.localeCompare(b.title);
      }
      if (sortField === 'status') {
        return sortDirection === 'desc'
          ? b.status.localeCompare(a.status)
          : a.status.localeCompare(b.status);
      }
      return 0;
    });
  };

  const filteredTickets = currentDepartment && tickets[currentDepartment] 
    ? sortTickets(tickets[currentDepartment].filter(ticket => {
        const matchesSearch = 
          ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (ticket.ticket_id && ticket.ticket_id.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = !statusFilter || ticket.status === statusFilter;
        return matchesSearch && matchesStatus;
      }))
    : [];

  // Pagination logic
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ticketsPerPage,
    currentPage * ticketsPerPage
  );

  // Add click handler
  const handleTicketClick = (ticketId) => {
    navigate(`/admin/tickets/${ticketId}`);
  };

  return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Department Tickets</h1>
        </div>

        {/* Department Tabs */}
        <div className="flex space-x-4 mb-6 overflow-x-auto pb-2">
          {departments.map((dept, index) => {
            const theme = getColorTheme(index);
            return (
              <button
                key={dept._id}
                onClick={() => setCurrentDepartment(dept.name)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  currentDepartment === dept.name
                    ? `${theme.bgColor} ${theme.color}`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Building2 size={20} />
                <span>{dept.name}</span>
                <span className="bg-white bg-opacity-50 px-2 py-0.5 rounded-full text-sm">
                  {tickets[dept.name]?.length || 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setSortDirection(sortField === 'title' && sortDirection === 'asc' ? 'desc' : 'asc');
                      setSortField('title');
                    }}
                  >
                    Title
                    {sortField === 'title' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setSortDirection(sortField === 'status' && sortDirection === 'asc' ? 'desc' : 'asc');
                      setSortField('status');
                    }}
                  >
                    Status
                    {sortField === 'status' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setSortDirection(sortField === 'createdAt' && sortDirection === 'asc' ? 'desc' : 'asc');
                      setSortField('createdAt');
                    }}
                  >
                    Created
                    {sortField === 'createdAt' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center">Loading tickets...</td>
                  </tr>
                ) : paginatedTickets.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center">No tickets found</td>
                  </tr>
                ) : (
                  paginatedTickets.map((ticket) => (
                    <tr 
                      key={ticket._id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleTicketClick(ticket._id)}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{ticket.title}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{ticket.ticket_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{ticket.from_department}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          ticket.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                          ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 py-4">
              <button
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  className={`px-3 py-1 rounded ${currentPage === i + 1 ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
  );
};

export default Tickets;