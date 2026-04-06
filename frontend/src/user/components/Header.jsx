import { Menu, Search, Filter, Bell, User, Download, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { getProfile } from '../services/authService';

const Header = ({ onMenuClick }) => {
  const { employee, notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead, clearNotification } = useAuth();
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    const fetchProfileImage = async () => {
      try {
        if (!employee) {
          setProfileImage(null);
          return;
        }
        const profileData = await getProfile();
        setProfileImage(profileData?.profile_image || null);
      } catch (error) {
        console.error('Error fetching profile image:', error);
      }
    };

    fetchProfileImage();
  }, [employee]);

  useEffect(() => {
    if (!showNotifications) return;
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <header className="bg-white shadow-sm border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full"
              onClick={() => setShowNotifications((prev) => !prev)}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-[#4B2D87] text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <Bell size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          markNotificationAsRead(notification.id);
                          if (notification.ticketId) {
                            navigate(`/my-tickets/${notification.ticketId}`);
                            setShowNotifications(false);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400">
                              {notification.updatedAt ? new Date(notification.updatedAt).toLocaleString() : ''}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNotification(notification.id);
                            }}
                            className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          {/* End Notification Bell */}
          <div 
            onClick={handleProfileClick}
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-[#4B2D87] rounded-full flex items-center justify-center overflow-hidden">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={18} className="text-white" />
              )}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {employee?.name || 'User'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
