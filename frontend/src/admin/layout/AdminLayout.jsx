import {useState} from 'react';
import AdminHeader from '../components/AdminHeader';
import AdminSidebar from '../components/AdminSidebar';

const AdminLayout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen]= useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return(
        <div className='flex h-screen bg-gray-50'>
            <AdminSidebar isOpen={isSidebarOpen} onClose={()=>setIsSidebarOpen(false)} />
            <div className='flex-1 flex flex-col overflow-hidden'>
                <AdminHeader onMenuClick={toggleSidebar}/>
                <main className='flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6'>
                    {children}
                </main>
            </div>
        </div>
    );
};
export default AdminLayout;