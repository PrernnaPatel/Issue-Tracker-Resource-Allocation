import { MoreHorizontal, TrendingUp, TrendingDown, Download, Calendar, Ticket, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAllTickets } from '../service/adminAuthService';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState('Jan 2025');
  const [ticketStats, setTicketStats] = useState({
    pending: [],
    in_progress: [],
    resolved: [],
    revoked: [],
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const tickets = await getAllTickets();
        console.log("hii",tickets._id);
        // Group tickets by status
        const pending = tickets.filter(ticket => ticket.status === 'pending');
        const in_progress = tickets.filter(ticket => ticket.status === 'in_progress');
        const resolved = tickets.filter(ticket => ticket.status === 'resolved');
        const revoked = tickets.filter(ticket => ticket.status === 'revoked');

        setTicketStats({
          pending,
          in_progress,
          resolved,
          revoked,
        });
      } catch (error) {
        console.error('Error fetching tickets:', error);
      }
    };

    fetchTickets();
  }, []);

  // Generate dynamic monthly data for 2025
  const generateMonthlyData = (tickets) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const currentYear = 2025;
    const monthlyCounts = {};

    // Initialize monthly counts for 2025
    months.forEach((month) => {
      monthlyCounts[month] = { 
        pending: 0, 
        in_progress: 0, 
        resolved: 0 
      };
    });

    // Group tickets by month and status for 2025
    tickets.forEach(ticket => {
      const date = new Date(ticket.createdAt);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const monthKey = month;

      if (year === currentYear && monthlyCounts[monthKey]) {
        switch (ticket.status) {
          case 'pending':
            monthlyCounts[monthKey].pending += 1;
            break;
          case 'in_progress':
            monthlyCounts[monthKey].in_progress += 1;
            break;
          case 'resolved':
            monthlyCounts[monthKey].resolved += 1;
            break;
        }
      }
    });

    // Convert to array format
    return months.map(month => ({
      month,
      pending: monthlyCounts[month].pending,
      in_progress: monthlyCounts[month].in_progress,
      resolved: monthlyCounts[month].resolved,
    }));
  };

  const ticketStatsCards = [
    {
      title: 'Pending Tickets',
      value: ticketStats.pending.length,
      icon: AlertCircle,
      color: 'from-blue-400 to-blue-500',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-300',
      iconColor: 'text-blue-500',
      tickets: ticketStats.pending,
    },
    {
      title: 'In Progress Tickets',
      value: ticketStats.in_progress.length,
      icon: Clock,
      color: 'from-yellow-400 to-yellow-500',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-300',
      iconColor: 'text-yellow-500',
      tickets: ticketStats.in_progress,
    },
    {
      title: 'Resolved Tickets',
      value: ticketStats.resolved.length,
      icon: CheckCircle,
      color: 'from-green-400 to-green-500',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-300',
      iconColor: 'text-green-500',
      tickets: ticketStats.resolved,
    },
    {
      title: 'Revoked Tickets',
      value: ticketStats.revoked.length,
      icon: XCircle,
      color: 'from-red-400 to-red-500',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300',
      iconColor: 'text-red-500',
      tickets: ticketStats.revoked,
    },
  ];

  // Generate dynamic monthly data from all tickets
  const monthlyData = generateMonthlyData([
    ...ticketStats.pending,
    ...ticketStats.in_progress,
    ...ticketStats.resolved,
    ...ticketStats.revoked,
  ]);

  // Fix maxValue calculation
  const maxValue = Math.max(...monthlyData.flatMap(d => [
    d.pending, 
    d.in_progress, 
    d.resolved
  ]));

  return (
    <div className="p-6 bg-white min-h-screen text-gray-800">
      {/* Ticket Stats Cards - Updated Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {ticketStatsCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <div
              key={index}
              className={`${card.bgColor} ${card.borderColor} border rounded-2xl p-6 shadow-md hover:transform hover:scale-105 transition-all duration-300 cursor-pointer group`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${card.color} flex items-center justify-center shadow-lg`}>
                  <IconComponent size={24} className="text-white" />
                </div>
                <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-black text-sm font-medium">{card.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-gray-800">{card.value}</span>
                  <div className={`${card.iconColor} opacity-60`}>
                    <IconComponent size={20} />
                  </div>
                </div>
              </div>

              {/* Mini preview of tickets */}
              <div className="mt-4 space-y-2 max-h-24 overflow-hidden">
                {card.tickets.slice(0, 2).map((ticket, idx) => (
                  <div key={idx} className="bg-white/80 rounded-lg p-2 text-xs">
                    <div className="text-black font-medium truncate">{ticket.title}</div>
                    <div className="text-black truncate">{ticket.description}</div>
                  </div>
                ))}
                {card.tickets.length > 2 && (
                  <div className="text-xs text-black text-center">
                    +{card.tickets.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Kanban View */}
      <div className="bg-gray-100 rounded-2xl p-6 border border-gray-300 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Ticket Management</h2>
          <button
          onClick={() => navigate('/admin/tickets')} 
          className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-purple-500 hover:to-pink-600 transition-colors">
            View All Tickets
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ticketStatsCards.map((column, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-300 shadow-sm">
              <div className={`p-4 rounded-t-xl bg-gradient-to-r ${column.color} text-white`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                  <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                    {column.tickets.length}
                  </span>
                </div>
              </div>
              
              <div className="p-4 max-h-96 overflow-y-auto">
                {column.tickets.length > 0 ? (
                  <div className="space-y-3">
                    {column.tickets.map((ticket, idx) => (
                      <div
                        onClick={() => navigate(`/admin/tickets/${ticket._id}`)} // Use ticket._id
                        key={ticket._id || idx} // Use _id as the key if available
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-gray-400 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-black truncate pr-2">
                            {ticket.title}
                          </h4>

                          <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-black line-clamp-2 mb-2">
                          {ticket.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-black">
                            #{ticket._id.slice(-6)} {/* Display the last 6 characters of the ID */}
                          </span>
                          <div
                            className={`w-2 h-2 rounded-full bg-gradient-to-r ${column.color}`}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-black">No tickets available</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Website Visitors */}
        <div className="bg-gray-100 rounded-xl p-6 border border-gray-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Ticket Overview</h3>
            <button 
            onClick={() => navigate('/admin/reports')}
            className="flex items-center space-x-2 text-gray-500 hover:text-gray-700">
              <span>Export</span>
              <Download size={16} />
            </button>
          </div>
          
          <div className="flex items-center justify-center mb-8">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#gradient1)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray="251.2"
                  strokeDashoffset="50.24"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-gray-800">
                  {Object.values(ticketStats).reduce((acc, tickets) => acc + tickets.length, 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {ticketStatsCards.slice(0, 3).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${item.color}`}></div>
                  <span className="text-gray-600">{item.title}</span>
                </div>
                <span className="text-gray-800 font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Ticket Trends */}
        <div className="bg-gray-100 rounded-xl p-6 border border-gray-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Monthly Ticket Trends</h3>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-3xl font-bold text-gray-800">
                  {Object.values(ticketStats).reduce((acc, tickets) => acc + tickets.length, 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-gray-500">
              <Calendar size={16} />
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-gray-500 text-sm focus:outline-none"
              >
                {monthlyData.map((data, index) => (
                  <option key={index} value={`${data.month} 2025`}>{`${data.month} 2025`}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-6 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-500 text-sm">Pending</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-500 text-sm">In Progress</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-500 text-sm">Resolved</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-500 text-sm">Revoked</span>
            </div>
          </div>

          {/* Fixed Chart Area */}
          <div className="relative">
            {/* Chart Container */}
            <div className="h-48 flex items-end justify-between px-2 pb-8">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex flex-col items-center space-y-2 w-full max-w-8">
                  {/* Bar Group */}
                  <div className="flex items-end space-x-1 h-40">
                    {/* Pending Tickets Bar */}
                    <div 
                      className="bg-gradient-to-t from-blue-400 to-blue-300 rounded-t w-2 min-h-1"
                      style={{ height: `${(data.pending / maxValue) * 140}px` }}
                      title={`Pending: ${data.pending}`}
                    ></div>
                    {/* In Progress Tickets Bar */}
                    <div 
                      className="bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t w-2 min-h-1"
                      style={{ height: `${(data.in_progress / maxValue) * 140}px` }}
                      title={`In Progress: ${data.in_progress}`}
                    ></div>
                    {/* Resolved Tickets Bar */}
                    <div 
                      className="bg-gradient-to-t from-green-400 to-green-300 rounded-t w-2 min-h-1"
                      style={{ height: `${(data.resolved / maxValue) * 140}px` }}
                      title={`Resolved: ${data.resolved}`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Month Labels */}
            <div className="flex justify-between px-2">
              {monthlyData.map((data, index) => (
                <span key={index} className="text-gray-500 text-xs text-center w-8">
                  {data.month}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
