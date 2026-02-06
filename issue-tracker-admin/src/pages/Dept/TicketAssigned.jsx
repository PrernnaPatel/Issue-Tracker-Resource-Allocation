import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Eye, Activity, CheckCircle2, XCircle, Ticket, User, Calendar, RefreshCw, HelpCircle, Clock, AlertCircle, MoreVertical } from 'lucide-react';
import { getDepartmentTickets, markTicketAsViewed } from '../../service/deptAuthService';
import { getIdFromToken, useDeptAuth } from '../../context/DeptAuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// Shared utility functions


// Move TicketCard component outside to prevent re-creation on every render
const TicketCard = ({ ticket, onViewTicket, unreadTickets }) => {

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  // Check if a ticket has unread updates
  const hasUnreadUpdates = (ticketId) => {
    return unreadTickets.some(ticket => ticket.ticketId === ticketId);
  };

  // Get unread count for a specific ticket
  const getUnreadCount = (ticketId) => {
    const unreadTicket = unreadTickets.find(ticket => ticket.ticketId === ticketId);
    return unreadTicket ? unreadTicket.unreadCount : 0;
  };

  const isUnread = hasUnreadUpdates(ticket._id);
  const unreadCount = getUnreadCount(ticket._id);
  
  return (
    <div className={`group bg-white rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden ${
      isUnread ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      {/* Priority indicator bar */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {ticket.title}
              </h3>
              {isUnread && (
                <div className="flex items-center justify-center w-3 h-3 bg-red-500 rounded-full flex-shrink-0">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {ticket.description}
            </p>
            {isUnread && (
              <p className="text-xs text-red-600 font-medium mt-2">
                {unreadCount} new update{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button className="ml-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all">
            <MoreVertical size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="flex items-center gap-3 mb-4">
          
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
            <Activity size={12} />
            In Progress
          </span>
        </div>
        {/* User info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{ticket.raised_by?.name}</p>
              <p className="text-xs text-gray-500">{ticket.raised_by?.email}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <Clock size={12} />
              {getTimeAgo(ticket.createdAt)}
            </div>
            <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium" onClick={() => onViewTicket(ticket._id)}>
              <Eye size={14} />
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TicketAssigned = () => {
  const { token } = useDeptAuth();
  const { unreadTickets, refreshUnreadTickets, removeTicketFromUnread } = useNotifications();
  const adminId = getIdFromToken(token);
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  // Helper to get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'NA';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getDepartmentTickets();
      if (result.success) {
        // Only in_progress tickets assigned to this admin
        const inProgressTickets = (result.tickets || [])
          .filter(ticket => ticket.status === 'in_progress' && String(ticket.assigned_to) === String(adminId))
          .map(ticket => ({
            ...ticket,
            raised_by: {
              ...ticket.raised_by,
              avatar: ticket.raised_by?.avatar || getInitials(ticket.raised_by?.name)
            }
          }));
        setTickets(inProgressTickets);
      } else {
        toast.error(result.message || 'Failed to fetch tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    if (adminId) {
      fetchTickets();
    }
  }, [fetchTickets]);

  // Refresh data when user returns to the page (e.g., after viewing a ticket)
  useEffect(() => {
    const handleFocus = () => {
      // Refresh unread tickets when user returns to the page
      refreshUnreadTickets();
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshUnreadTickets]);

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.description && ticket.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const handleRefresh = async () => {
    await fetchTickets();
    await refreshUnreadTickets();
    toast.success('Tickets refreshed successfully');
  };

  const handleViewTicket = useCallback(async (ticketId) => {
    try {
      await markTicketAsViewed(ticketId);
      removeTicketFromUnread(ticketId); // Optimistically update UI
      await refreshUnreadTickets();
      navigate(`/dept/tickets/${ticketId}`);
    } catch (error) {
      console.error('Error marking ticket as viewed:', error);
      navigate(`/dept/tickets/${ticketId}`);
    }
  }, [navigate, refreshUnreadTickets, removeTicketFromUnread]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Assigned Tickets
              </h1>
              <p className="text-lg text-gray-600">
                {tickets.length} active tickets
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search tickets by title or description..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Table
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets Display */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-600 font-medium">Loading tickets...</span>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-20">
            <Activity className="text-gray-300 mx-auto mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search criteria' : 'Tickets will appear here when assigned to your department'}
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTickets.map((ticket) => (
              <TicketCard key={ticket._id} ticket={ticket} onViewTicket={handleViewTicket} unreadTickets={unreadTickets} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-x-auto mt-8">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 sticky top-0 z-20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-100">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-100">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-100">Raised By</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-100">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-100">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket, idx) => {
                  const isUnread = unreadTickets.some(t => t.ticketId === ticket._id);
                  return (
                    <tr
                      key={ticket._id}
                      className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 border-b border-gray-100 ${
                        isUnread ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-semibold text-gray-900 max-w-xs truncate">
                        <div className="flex items-center gap-2">
                          {ticket.title}
                          {isUnread && (
                            <div className="flex items-center justify-center w-2 h-2 bg-red-500 rounded-full flex-shrink-0">
                              <div className="w-1 h-1 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{ticket.description}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">{ticket.raised_by?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-400">{ticket.raised_by?.email || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                          <Activity size={12} />
                          In Progress
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewTicket(ticket._id)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors font-semibold"
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketAssigned;