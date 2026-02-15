import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Bug, FileText, BarChart3, Settings, LogOut, ChevronDown, Shield, Building2, UserCheck, Package } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useDeptAuth } from '../context/DeptAuthContext';
import { useNotifications } from '../context/NotificationContext';
import { toast } from 'react-toastify';
import LogoutModal from './LogoutModal';

const DepartmentAdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { deptAdmin, logout } = useDeptAuth();
  const { totalUnreadTickets, unreadTickets } = useNotifications();
  const [activeItem, setActiveItem] = useState('dashboard');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const path = location.pathname.split('/')[2] || 'dashboard';
    setActiveItem(path);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowProfileMenu((prev) => !prev);
  };

  const handleLogoutConfirm = async () => {
    try {
      setIsLoggingOut(true);
      logout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to logout');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  // Check if user has access to inventory based on department
  const hasInventoryAccess = () => {
    if (!deptAdmin?.department) return false;
    
    const departmentName = typeof deptAdmin.department === 'object' 
      ? deptAdmin.department.name 
      : deptAdmin.department;
    
    // Allow access for IT and Network Engineer departments
    return departmentName.toLowerCase().includes('it') || 
           departmentName.toLowerCase().includes('network engineer');
  };

  const hasNetworkEngineerAccess = () => {
    if (!deptAdmin?.department) return false;

    const departmentName = typeof deptAdmin.department === 'object'
      ? deptAdmin.department.name
      : deptAdmin.department;

    return /^it(\s+department)?$/i.test(departmentName || '');
  };

  const getSidebarTitle = () => {
    if (!deptAdmin?.department) return 'Dept Admin';
    const departmentName = typeof deptAdmin.department === 'object'
      ? deptAdmin.department.name
      : deptAdmin.department;
    return departmentName?.toLowerCase().includes('network engineer')
      ? 'Network Engineer'
      : 'Dept Admin';
  };

  // Calculate assigned unread tickets for this admin
  const assignedUnreadCount = unreadTickets && deptAdmin && deptAdmin._id
    ? unreadTickets.filter(
        t => t.assigned_to && (
          (typeof t.assigned_to === 'object' ? t.assigned_to._id : t.assigned_to) === deptAdmin._id
        )
      ).length
    : 0;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dept/dashboard' },
    { 
      id: 'tickets', 
      label: 'Department Tickets', 
      icon: Bug, 
      path: '/dept/tickets',
      badge: totalUnreadTickets > 0 ? totalUnreadTickets : null
    },
    { 
      id: 'ticket-assigned', 
      label: 'Ticket Assigned', 
      icon: UserCheck, 
      path: '/dept/ticket-assigned',
      badge: assignedUnreadCount > 0 ? assignedUnreadCount : null
    },
    { id: 'reports', label: 'Reports', icon: FileText, path: '/dept/reports' },
    ...(hasNetworkEngineerAccess() ? [{ id: 'network-engineers', label: 'Network Engineers', icon: Users, path: '/dept/network-engineers' }] : []),
    // Conditionally show inventory based on department access
    ...(hasInventoryAccess() ? [{ id: 'inventory', label: 'Inventory', icon: Package, path: '/dept/inventory' }] : []),
    {
      id: 'profile',
      label: (
        <div className="flex flex-col">
          <span>{deptAdmin?.name || 'John Doe'}</span>
          <span className="text-sm text-gray-500">{deptAdmin?.department || 'IT Department'}</span>
        </div>
      ),
      icon: Shield,
    },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-md transform transition-transform duration-300 z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-300">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center">
              <Building2 size={20} className="text-white"/>
            </div>
            <span className="text-xl font-bold text-gray-800">{getSidebarTitle()}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;

              if (item.hasSubmenu) {
                return (
                  <div key={item.id} ref={profileMenuRef}>
                    <div
                      onClick={handleProfileClick}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors cursor-pointer ${
                        showProfileMenu ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon size={20} className="text-gray-500" />
                        <div className="flex flex-col">
                          <span className="font-medium">{deptAdmin?.name || 'John Doe'}</span>
                          {deptAdmin?.department && (
                            <span className="text-sm text-gray-500">{deptAdmin.department}</span>
                          )}
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-gray-500 transform transition-transform duration-200 ${
                          showProfileMenu ? 'rotate-180' : ''
                        }`}
                      />
                    </div>

                    {/* Submenu */}
                    {showProfileMenu && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.submenu.map((subItem) => (
                          <Link
                            key={subItem.id}
                            to={subItem.path}
                            onClick={() => setShowProfileMenu(false)}
                            className="flex items-center space-x-3 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <subItem.icon size={18} />
                            <span>{subItem.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setActiveItem(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={20} className="text-gray-500" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.badge && (
                    <div className="flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full">
                      {item.badge > 99 ? '99+' : item.badge}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-300">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} className="text-red-500" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        isLoggingOut={isLoggingOut}
      />
    </>
  );
};

export default DepartmentAdminSidebar;
