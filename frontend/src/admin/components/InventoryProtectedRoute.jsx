import { Navigate } from 'react-router-dom';
import { useDeptAuth } from '../context/DeptAuthContext';

const InventoryProtectedRoute = ({ children }) => {
  const { deptAdmin, loading } = useDeptAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

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

  if (!hasInventoryAccess()) {
    console.log('InventoryProtectedRoute: Access denied, redirecting to dashboard');
    return <Navigate to="/dept/dashboard" replace />;
  }

  return children;
};

export default InventoryProtectedRoute; 