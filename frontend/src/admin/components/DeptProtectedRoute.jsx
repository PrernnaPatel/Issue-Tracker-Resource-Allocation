import { Navigate } from 'react-router-dom';
import { useDeptAuth } from '../context/DeptAuthContext';

const DeptProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useDeptAuth();
  if (loading) {
    console.log('DeptProtectedRoute: showing loading');
    return <div>Loading...</div>; // You can replace this with a proper loading component
  }

  if (!isAuthenticated) {
    console.log('DeptProtectedRoute: not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default DeptProtectedRoute; 
