import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAdminInfo, getAdminToken } from '../service/adminAuthService';
import { useNavigate } from 'react-router-dom';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [adminToken, setAdminToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing admin session
    const token = getAdminToken();
    const adminInfo = getAdminInfo();

    if (token && adminInfo) {
      setAdminToken(token);
      setAdmin(adminInfo);
    }
    
    setLoading(false);
  }, []);

  const logout = () => {
    setAdmin(null);
    setAdminToken(null);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    navigate('/login');
  };

  const updateAdminContext = (adminData) => {
    if (adminData) {
      setAdmin(adminData.admin);
      setAdminToken(adminData.token);
    } else {
      setAdmin(null);
      setAdminToken(null);
    }
  };

  const value = {
    admin,
    adminToken,
    loading,
    updateAdminContext,
    logout, // Expose logout function in the context
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {!loading && children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
