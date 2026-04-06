import { Bug, Edit2, X, Check, ChevronDown, ChevronUp, CalendarIcon, Filter, ChevronLeft, ChevronRight, Search, Eye, Clock, CheckCircle, AlertCircle, XCircle, Ticket, Building2, Calendar, User, FileText, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getMyTickets, getAllDepartments, filterTickets } from '../services/authService';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [filterParams, setFilterParams] = useState({
    status: '',
    to_department: '',
    startDate: '',
    endDate: ''
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const ticketsPerPage = 5;
  const navigate = useNavigate();

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'revoked', label: 'Revoked' }
  ];

  const fetchTickets = async () => {
    try {
      const fetchedTickets = await getMyTickets();
      setTickets(fetchedTickets);
      setCurrentPage(1);
    } catch {
      toast.error('Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await getAllDepartments();
        const validDepartments = data.filter(dept => dept && (dept._id || dept.id) && dept.name);
        setDepartments(validDepartments);
      } catch {
        toast.error('Failed to load departments');
        setDepartments([]);
      }
    };
    fetchDepartments();
  }, []);

  const handleFilter = async () => {
    try {
      setLoading(true);
      const filteredResults = await filterTickets(filterParams);
      setTickets(filteredResults);
      setCurrentPage(1);
    } catch {
      toast.error('Failed to filter tickets');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(tickets.length / ticketsPerPage);
  const startIndex = (currentPage - 1) * ticketsPerPage;
  const endIndex = startIndex + ticketsPerPage;

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ticket.ticket_id && ticket.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#4B2D87]">My Tickets</h1>
          <p className="text-gray-600 mt-1">View and manage your submitted tickets</p>
        </div>
        <button
          onClick={() => navigate('/raise-ticket')}
          className="flex items-center gap-2 bg-[#4B2D87] text-white font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all duration-300 hover:bg-[#3D2276]"
        >
          <Plus size={18} />
          Raise New Ticket
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B2D87] bg-gray-50"
            placeholder="Search tickets by title, description, or Ticket ID..."
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        </div>
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
              isFilterOpen || Object.values(filterParams).some(value => value !== '')
                ? 'bg-[#4B2D87] text-white border-[#4B2D87]'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            <span>Filter</span>
            {Object.values(filterParams).some(value => value !== '') && (
              <span className="ml-1 w-2 h-2 rounded-full bg-white" />
            )}
          </button>
          {isFilterOpen && (
            <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10 w-[340px]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filterParams.status}
                    onChange={e => setFilterParams(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B2D87]"
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={filterParams.to_department}
                    onChange={e => setFilterParams(prev => ({ ...prev, to_department: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B2D87]"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filterParams.startDate}
                    onChange={e => setFilterParams(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B2D87]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={filterParams.endDate}
                    onChange={e => setFilterParams(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B2D87]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  {Object.values(filterParams).some(value => value !== '') && (
                    <button
                      onClick={() => {
                        setFilterParams({ status: '', to_department: '', startDate: '', endDate: '' });
                        fetchTickets();
                        setIsFilterOpen(false);
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleFilter();
                      setIsFilterOpen(false);
                    }}
                    className="px-4 py-2 text-sm bg-[#4B2D87] text-white rounded-lg hover:bg-[#3D2276] transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Loading your tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Bug size={40} className="text-gray-300 mb-2" />
            <h3 className="text-lg font-semibold text-gray-700">No Tickets Found</h3>
            <p className="text-sm text-gray-500 mt-1">You haven't raised any tickets yet.</p>
            <button
              onClick={() => navigate('/raise-ticket')}
              className="mt-4 flex items-center gap-2 bg-[#4B2D87] text-white font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all duration-300 hover:bg-[#3D2276]"
            >
              <Plus size={18} />
              Raise New Ticket
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Title</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Ticket ID</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Department</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.slice(startIndex, endIndex).map(ticket => (
                  <tr key={ticket._id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors duration-200 cursor-pointer" onClick={() => navigate(`/my-tickets/${ticket._id}`)}>
                    <td className="py-4 px-4 text-sm text-gray-900 font-medium">{ticket.title}</td>
                    <td className="py-4 px-4 text-sm text-gray-500">{ticket.ticket_id}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        ticket.status === "pending"
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : ticket.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                            : ticket.status === "resolved"
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : "bg-red-100 text-red-800 border border-red-300"
                      }`}>
                        {ticket.status === "in_progress"
                          ? "In Progress"
                          : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">{ticket.to_department?.name || ticket.to_department}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{format(new Date(ticket.createdAt), 'dd/MM/yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredTickets.length > ticketsPerPage && (
        <div className="flex items-center justify-between mt-8">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredTickets.length)} of {filteredTickets.length} tickets
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex space-x-1">
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index + 1}
                  onClick={() => handlePageChange(index + 1)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentPage === index + 1
                      ? 'bg-[#4B2D87] text-white'
                      : 'text-gray-600 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTickets;