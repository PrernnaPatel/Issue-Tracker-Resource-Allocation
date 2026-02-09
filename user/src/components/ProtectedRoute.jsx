import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { employee } = useAuth();
  if (!employee) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;