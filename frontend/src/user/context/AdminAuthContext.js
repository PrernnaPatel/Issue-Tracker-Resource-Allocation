import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAdminInfo, getAdminToken } from '../services/adminAuthService';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [adminToken, setAdminToken] = useState(null);
  const [loading, setLoading] = useState(true);

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