import { createContext, useContext, useState, useEffect } from 'react';
import { getDeptAdminToken, getDeptAdminData } from '../service/deptAuthService';

const DeptAuthContext = createContext();

export const useDeptAuth = () => {
  const context = useContext(DeptAuthContext);
  if (!context) {
    throw new Error('useDeptAuth must be used within a DeptAuthProvider');
  }
  return context;
};

export const DeptAuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [deptAdmin, setDeptAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token and admin data on mount
    const storedToken = getDeptAdminToken();
    const storedAdminData = getDeptAdminData();
    if (storedToken && storedAdminData) {
      setToken(storedToken);
      setDeptAdmin(storedAdminData);
    }
    setLoading(false);
  }, []);

  const login = (newToken, newAdminData) => {
    setToken(newToken);
    setDeptAdmin(newAdminData);
  };

  const logout = () => {
    localStorage.removeItem('deptAdminToken');
    localStorage.removeItem('deptAdminData');
    setToken(null);
    setDeptAdmin(null);
  };

  const value = {
    token,
    deptAdmin,
    loading,
    setDeptAdmin,
    setLoading,
    login,
    logout,
    isAuthenticated: !!token
  };

  return (
    <DeptAuthContext.Provider value={value}>
      {!loading && children}
    </DeptAuthContext.Provider>
  );
};

export default DeptAuthContext;

// Helper to extract admin ID from JWT token (no dependencies)
export function getIdFromToken(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const decoded = JSON.parse(atob(padded));
    // Adjust the property name below to match your token's structure!
    return decoded._id || decoded.id || decoded.adminId;
  } catch {
    return null;
  }
} 