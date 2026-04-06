import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Bug, FileText, BarChart3, Settings, LogOut, ChevronDown, Shield, Building2, UserCog, Package } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { toast } from 'react-toastify';
import LogoutModal from './LogoutModal';

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { admin, logout } = useAdminAuth();
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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/admin/dashboard' },
    { id: 'employee', label: 'Employee', icon: Users, path: '/admin/employee' },
    { id: 'tickets', label: 'Tickets', icon: Bug, path: '/admin/tickets' },
    { id: 'departments', label: 'Departments', icon: FileText, path: '/admin/departments' },
    { id: 'buildings', label: 'Buildings', icon: Building2, path: '/admin/buildings' },
    { id: 'dept-admins', label: 'Departmental Admins', icon: UserCog, path: '/admin/departmental-admins' },
    { id: 'network-engineers', label: 'Network Engineers', icon: Shield, path: '/admin/network-engineers' },
    { id: 'reports', label: 'Reports', icon: BarChart3, path: '/admin/reports' },
    { id: 'component-sets', label: 'Component Sets', icon: Package, path: '/admin/component-sets' },
    { id: 'logs', label: 'Action Logs', icon: FileText, path: '/admin/logs' },
  ];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-30 z-40 lg:hidden" onClick={onClose} />}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-white shadow-md transform transition-transform duration-300 z-50 flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto border-r border-gray-300`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-300">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-r from-cyan-300 to-purple-400 rounded-lg flex items-center justify-center">
              <Bug size={20} className="text-black"/>
            </div>
            <span className="text-lg font-bold text-gray-800">Issue Tracker Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-5 overflow-y-auto min-h-0">
          <div className="space-y-1.5">
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
                          <span className="font-medium">{admin?.name || 'Admin Profile'}</span>
                          {admin?.role && (
                            <span className="text-sm text-gray-500">{admin.role}</span>
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
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-200'
                  } text-base`}
                >
                  <Icon size={20} className="text-gray-500" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-5 border-t border-gray-300">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-base"
          >
            <LogOut size={20} className="text-red-500" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

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

export default AdminSidebar;
