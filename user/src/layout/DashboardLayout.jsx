import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const DashboardLayout = () => {
  const { employee, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!employee) return null;

  return (
    <div className="flex h-screen bg-[#F3F4F8]">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        handleLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header onMenuClick={toggleSidebar} />
        
        {/* Main Content Area with shadow and rounded corners */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-2xl shadow-sm">
             
                <Outlet />
            
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;