import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const ProtectedRoute = ({ children }) => {
  const { adminToken } = useAdminAuth();

  if (!adminToken) {
    // Redirect to admin login if the user is not authenticated
    return <Navigate to="/admin-login" replace />;
  }

  return children;
};

export default ProtectedRoute;