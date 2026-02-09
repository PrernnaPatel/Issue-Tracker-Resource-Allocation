import { Outlet } from 'react-router-dom';
import DeptHeader from '../components/DepartmentalAdminHeader';
import DeptSidebar from '../components/DepartmentalAdminSidebar';
import { useState } from 'react';

const DepartmentLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <DeptSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header */}
        <DeptHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 mt-16">
            <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DepartmentLayout;