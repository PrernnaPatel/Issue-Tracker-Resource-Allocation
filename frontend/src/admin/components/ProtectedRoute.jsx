import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const ProtectedRoute = ({ children }) => {
  const { adminToken } = useAdminAuth();

  if (!adminToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
