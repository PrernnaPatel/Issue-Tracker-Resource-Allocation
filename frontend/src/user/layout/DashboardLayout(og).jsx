import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import HomePage from '../components/HomePage';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        <Header onMenuClick={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto">
          <HomePage />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;