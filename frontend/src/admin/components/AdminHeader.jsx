import { Bell, User } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getAdminInfo } from '../service/adminAuthService';

const AdminHeader = ({ onMenuClick }) => {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    const fetchProfileImage = async () => {
      try {
        const adminData = await getAdminInfo();
        setProfileImage(adminData?.profile_image || null);
      } catch (error) {
        console.error('Error fetching profile image:', error);
      }
    };

    fetchProfileImage();
  }, []);

  const handleProfileClick = () => {
    navigate('/admin/profile');
  };

  return (
    <header className="bg-white border-b border-gray-300 px-6 py-4 flex items-center justify-between w-full shadow-sm">
      {/* Left Section */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-200"
      >
        <Bell size={20} />
      </button>

      {/* Right Section */}
      <div className="flex items-center space-x-4 ml-auto">
        {/* Notification Bell */}
        <button className="relative p-2 text-gray-500 hover:bg-gray-200 rounded-full">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full"></span>
        </button>

        {/* Profile Section */}
        <div
          onClick={handleProfileClick}
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-200 p-2 rounded-lg transition-colors"
        >
          <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center overflow-hidden">
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
          <span className="text-sm font-medium text-gray-800">
            {admin?.name || 'Admin'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;