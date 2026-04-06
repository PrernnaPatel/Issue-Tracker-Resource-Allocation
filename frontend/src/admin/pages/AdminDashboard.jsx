import React, { useState } from 'react';
import { 
  AlertCircle, Clock, CheckCircle, XCircle, 
  Users, Building, Search, Filter, ChevronDown 
} from 'lucide-react';
import AdminStatsCard from '../components/AdminStatsCard';

const AdminDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const stats = [
    { title: 'Total Users', value: '1,247', icon: Users, color: 'bg-blue-500' },
    { title: 'Active Tickets', value: '89', icon: AlertCircle, color: 'bg-red-500' },
    { title: 'Resolved Today', value: '23', icon: CheckCircle, color: 'bg-green-500' },
    { title: 'Pending Review', value: '34', icon: Clock, color: 'bg-yellow-500' },
    { title: 'Departments', value: '12', icon: Building, color: 'bg-purple-500' },
    { title: 'System Health', value: '98.5%', icon: TrendingUp, color: 'bg-green-600' },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B5E20] mb-2">Welcome back, Admin!</h1>
        <p className="text-gray-600">Here's what's happening with your tickets today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {stats.map((stat, index) => (
          <AdminStatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#1B5E20]">Recent Tickets</h2>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E20] focus:border-transparent"
                />
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <Filter size={16} />
                <span>Filter</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ticket ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {/* Sample data for demonstration */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1B5E20]">#T001</td>
                <td className="px-6 py-4 text-sm text-gray-900">System login issue</td>
                <td className="px-6 py-4 text-sm text-gray-600">IT Department</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Open
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    High
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">2 hours ago</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-[#1B5E20] hover:text-[#2E7D32] text-sm font-medium">
                    View Details
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1B5E20]">#T002</td>
                <td className="px-6 py-4 text-sm text-gray-900">Equipment request</td>
                <td className="px-6 py-4 text-sm text-gray-600">HR Department</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    In Progress
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Medium
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">5 hours ago</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-[#1B5E20] hover:text-[#2E7D32] text-sm font-medium">
                    View Details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Empty state when no tickets */}
        {tickets.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-600">All caught up! No tickets to display at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;