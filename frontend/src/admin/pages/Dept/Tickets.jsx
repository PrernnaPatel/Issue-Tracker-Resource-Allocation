import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Eye, Clock, CheckCircle2, XCircle, Activity, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDepartmentTickets } from '../../service/deptAuthService';
import { useDeptAuth } from '../../context/DeptAuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useDeptSocket } from '../../context/DeptSocketContext';
import { toast } from 'react-toastify';

const DepartmentTickets = () => {
  const navigate = useNavigate();
  const { deptAdmin } = useDeptAuth();
  const { socket } = useDeptSocket();
  const { unreadTickets, refreshUnreadTickets, markAllAsRead } = useNotifications();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(10);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getDepartmentTickets();
      
      if (result.success) {
        setTickets(result.tickets);
      } else {
        toast.error(result.message || 'Failed to fetch tickets');
        // Fallback to static data
        setTickets([
          {
            _id: 1,
            title: "Printer not working in Lab 101",
            description: "The printer in Lab 101 is showing error messages and not printing",
            status: "pending",
            createdAt: "2024-03-20T10:00:00Z",
            raised_by: { name: "John Doe", email: "john@example.com" }
          },
          {
            _id: 2,
            title: "Network connectivity issue in Building A",
            description: "WiFi connection is very slow in Building A",
            status: "in_progress",
            createdAt: "2024-03-19T15:30:00Z",
            raised_by: { name: "Jane Smith", email: "jane@example.com" }
          },
          {
            _id: 3,
            title: "AC not working in Room 203",
            description: "Air conditioning unit is not cooling properly",
            status: "resolved",
            createdAt: "2024-03-18T09:15:00Z",
            raised_by: { name: "Mike Johnson", email: "mike@example.com" }
          },
          {
            _id: 4,
            title: "Software installation request",
            description: "Need Adobe Creative Suite installed on lab computers",
            status: "revoked",
            createdAt: "2024-03-17T14:20:00Z",
            raised_by: { name: "Sarah Wilson", email: "sarah@example.com" }
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewTicket = () => {
      fetchTickets();
    };
    socket.on('new-ticket', handleNewTicket);
    return () => {
      socket.off('new-ticket', handleNewTicket);
    };
  }, [socket, fetchTickets]);

  // Check if a ticket has unread updates
  const hasUnreadUpdates = (ticketId) => {
    return unreadTickets.some(ticket => ticket.ticketId === ticketId);
  };

  // Get unread count for a specific ticket
  const getUnreadCount = (ticketId) => {
    const unreadTicket = unreadTickets.find(ticket => ticket.ticketId === ticketId);
    return unreadTicket ? unreadTicket.unreadCount : 0;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' };
      case 'in_progress':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
      case 'resolved':
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
      case 'revoked':
        return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
    }
  };

  const getRowBg = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-50';
      case 'in_progress':
        return 'bg-yellow-50';
      case 'resolved':
        return 'bg-green-50';
      case 'revoked':
        return 'bg-red-50';
      default:
        return 'bg-white';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} />;
      case 'in_progress':
        return <Activity size={16} />;
      case 'resolved':
        return <CheckCircle2 size={16} />;
      case 'revoked':
        return <XCircle size={16} />;
      default:
        return <Ticket size={16} />;
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

  const filteredTickets = sortTickets(tickets.filter(ticket => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.description && ticket.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ticket.ticket_id && ticket.ticket_id.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = !statusFilter || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  }));

  // Pagination
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  const handleTicketClick = (ticketId) => {
    navigate(`/dept/tickets/${ticketId}`);
  };

  const handleSort = (field) => {
    setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  const handleRefresh = async () => {
    await fetchTickets();
    await refreshUnreadTickets();
    toast.success('Tickets refreshed successfully');
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      await fetchTickets();
      toast.success('All tickets marked as read');
    } catch (error) {
      toast.error(error?.message || 'Failed to mark all as read');
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Department Tickets</h1>
          <p className="text-gray-600">
            {typeof deptAdmin?.department === 'object'
              ? deptAdmin?.department?.name
              : deptAdmin?.department || 'Department'} - Manage and track all tickets
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Mark All as Read
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-blue-100 rounded-xl shadow-lg border border-blue-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Pending</p>
              <h3 className="text-2xl font-bold text-blue-800">
                {tickets.filter(t => t.status === 'pending').length}
              </h3>
            </div>
            <div className="p-2 bg-blue-500 rounded-lg">
              <Clock className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-yellow-100 rounded-xl shadow-lg border border-yellow-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">In Progress</p>
              <h3 className="text-2xl font-bold text-yellow-800">
                {tickets.filter(t => t.status === 'in_progress').length}
              </h3>
            </div>
            <div className="p-2 bg-yellow-400 rounded-lg">
              <Activity className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-green-100 rounded-xl shadow-lg border border-green-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Resolved</p>
              <h3 className="text-2xl font-bold text-green-800">
                {tickets.filter(t => t.status === 'resolved').length}
              </h3>
            </div>
            <div className="p-2 bg-green-500 rounded-lg">
              <CheckCircle2 className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-red-100 rounded-xl shadow-lg border border-red-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Revoked</p>
              <h3 className="text-2xl font-bold text-red-800">
                {tickets.filter(t => t.status === 'revoked').length}
              </h3>
            </div>
            <div className="p-2 bg-red-500 rounded-lg">
              <XCircle className="text-white" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search tickets by title, description, or ID..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400" size={20} />
            <select
              className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      </div>

      {/* Color Codes Legend */}
      <div className="mb-4 bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span className="font-semibold text-gray-700">Color Codes:</span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-300"></span> Pending
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-yellow-300"></span> In Progress
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-300"></span> Resolved
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-300"></span> Revoked
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-orange-400"></span> Unread
          </span>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center gap-2">
                    Title
                    {sortField === 'title' && (
                      <span className="text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ticket ID</th>
                <th 
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortField === 'status' && (
                      <span className="text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2">
                    Created
                    {sortField === 'createdAt' && (
                      <span className="text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-gray-500">Loading tickets...</span>
                    </div>
                  </td>
                </tr>
              ) : currentTickets.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Ticket className="text-gray-300 mb-2" size={48} />
                      <p className="text-lg font-medium text-gray-500">No tickets found</p>
                      <p className="text-sm text-gray-400">
                        {searchQuery || statusFilter ? 'Try adjusting your filters' : 'Tickets will appear here once they are created'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentTickets.map((ticket) => {
                  const statusColors = getStatusColor(ticket.status);
                  const isUnread = hasUnreadUpdates(ticket._id);
                  const unreadCount = getUnreadCount(ticket._id);
                  const rowBg = getRowBg(ticket.status);
                  
                  return (
                    <tr 
                      key={ticket._id} 
                      className={`${rowBg} hover:brightness-95 transition-colors cursor-pointer`}
                      onClick={() => handleTicketClick(ticket._id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {isUnread && (
                            <div className="flex items-center justify-center w-3 h-3 bg-orange-400 rounded-full flex-shrink-0"></div>
                          )}
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">{ticket.title}</h3>
                            <p className={`text-xs font-medium mt-1 ${isUnread ? 'text-red-600' : 'text-gray-500'}`}>
                              {unreadCount} new update{unreadCount === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {ticket.ticket_id || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                          {getStatusIcon(ticket.status)}
                          {ticket.status === 'in_progress' ? 'In Progress' : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTicketClick(ticket._id);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {indexOfFirstTicket + 1} to {Math.min(indexOfLastTicket, filteredTickets.length)} of {filteredTickets.length} tickets
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentTickets; 
