import React, { useState, useEffect } from 'react';
import { Ticket, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyTickets } from '../services/authService';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const StatsCard = ({ title, value, icon, bgColor, textColor, iconBg }) => (
  <div className={`${bgColor} rounded-xl shadow-lg border p-6 transform hover:scale-105 transition-transform duration-200`}>
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm ${textColor} font-medium`}>{title}</p>
        <h3 className={`text-3xl font-bold ${textColor} mt-1`}>{value}</h3>
      </div>
      <div className={`p-3 ${iconBg} rounded-xl shadow-lg`}>
        {icon && React.createElement(icon, { className: "text-white", size: 24 })}
      </div>
    </div>
  </div>
);

export default function HomePage() {
  const { employee } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getMyTickets();
      setTickets(result || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setError(error.message);
      toast.error("Failed to fetch tickets.");
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalTickets: tickets.length,
    pendingTickets: tickets.filter(ticket => ticket.status === 'pending').length,
    inProgressTickets: tickets.filter(ticket => ticket.status === 'in_progress').length,
    resolvedTickets: tickets.filter(ticket => ticket.status === 'resolved').length,
    revokedTickets: tickets.filter(ticket => ticket.status === 'revoked').length
  };

  const recentTickets = tickets
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4B2D87]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Error: {error}</p>
        </div>
      )}
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Welcome, {employee?.name || 'User'}</h1>
        <p className="text-gray-600">Your personal ticket dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatsCard title="Total Tickets" value={stats.totalTickets} icon={Ticket} bgColor="bg-purple-100" textColor="text-purple-800" iconBg="bg-purple-500" />
        <StatsCard title="Pending Tickets" value={stats.pendingTickets} icon={Clock} bgColor="bg-blue-100" textColor="text-blue-800" iconBg="bg-blue-500" />
        <StatsCard title="In Progress" value={stats.inProgressTickets} icon={TrendingUp} bgColor="bg-yellow-100" textColor="text-yellow-800" iconBg="bg-yellow-400" />
        <StatsCard title="Resolved Tickets" value={stats.resolvedTickets} icon={CheckCircle2} bgColor="bg-green-100" textColor="text-green-800" iconBg="bg-green-500" />
        <StatsCard title="Revoked Tickets" value={stats.revokedTickets} icon={XCircle} bgColor="bg-red-100" textColor="text-red-800" iconBg="bg-red-500" />
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow duration-300 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Recent Tickets</h2>
          <button onClick={fetchTickets} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Title</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Created At</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Department</th>
              </tr>
            </thead>
            <tbody>
              {recentTickets.length > 0 ? (
                recentTickets.map((ticket) => (
                  <tr 
                    key={ticket._id} 
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                    onClick={() => navigate(`/my-tickets/${ticket._id}`)}
                  >
                    <td className="py-4 px-4 text-sm text-gray-900 font-medium">{ticket.title}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        ticket.status === 'pending' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                        ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                        ticket.status === 'resolved' ? 'bg-green-100 text-green-800 border border-green-300' : 
                        'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{ticket.to_department?.name || 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-gray-500">No tickets found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}