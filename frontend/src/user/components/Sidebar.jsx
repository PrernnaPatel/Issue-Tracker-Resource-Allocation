import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  Bug, 
  FileText,
  LogOut, 
  X,
  ChevronDown,
  User,
  Lock
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState('dashboard');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  const { employee } = useAuth();

  useEffect(() => {
  }, [employee]);

  useEffect(() => {
    const path = location.pathname.split('/')[1] || 'dashboard';
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
    setShowProfileMenu(prev => !prev);
  };

  const handleLogoutClick = () => {
    navigate('/logout');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
    { id: 'raiseTicket', label: 'Raise Ticket', icon: FileText, path: '/raise-ticket' },
    { id: 'myTickets', label: 'My Tickets', icon: Bug, path: '/my-tickets' },
    { 
      id: 'profile', 
      label: 'Profile',
      icon: User,
      hasSubmenu: true,
      submenu: [
        { id: 'viewProfile', label: 'Profile', icon: User, path: '/profile' },
        { id: 'changePassword', label: 'Change Password', icon: Lock, path: '/change-password' }
      ]
    }
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <div className={`fixed left-0 top-0 h-full w-64 bg-[#4B2D87] shadow-lg transform transition-transform duration-300 z-50 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:z-auto rounded-r-3xl`}>
        
        <div className="flex items-center justify-between p-6 border-b border-[#5E3A9F]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Bug className="text-[#4B2D87]" size={18} />
            </div>
            <span className="text-xl font-bold text-white">IssueTracker</span>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-[#5E3A9F]"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              
              if (item.hasSubmenu) {
                return (
                  <div key={item.id} ref={profileMenuRef}>
                    <div
                      onClick={handleProfileClick}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors cursor-pointer ${
                        showProfileMenu ? 'bg-[#5E3A9F] text-white' : 'text-white hover:bg-[#5E3A9F]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon size={20} className="text-white" />
                        <div className="flex flex-col">
                          <span className="font-medium">{employee?.name || 'Profile'}</span>
                          <span className="text-sm text-gray-300">
                            {employee?.department?.name ? `Department: ${employee.department.name}` : 'No Department'}
                          </span>
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-white transform transition-transform duration-200 ${
                          showProfileMenu ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    
                    {showProfileMenu && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.submenu.map((subItem) => (
                          <Link
                            key={subItem.id}
                            to={subItem.path}
                            onClick={() => setShowProfileMenu(false)}
                            className="flex items-center space-x-3 px-4 py-2 text-white hover:bg-[#6B4EA5] rounded-lg transition-colors"
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
                    activeItem === item.id
                      ? 'bg-[#5E3A9F] text-white'
                      : 'text-white hover:bg-[#5E3A9F]'
                  }`}
                >
                  <Icon size={20} className="text-white" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-[#5E3A9F] mt-auto">
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center space-x-3 px-4 py-3 text-white hover:bg-[#5E3A9F] rounded-lg transition-colors"
          >
            <LogOut size={20} className="text-white" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

