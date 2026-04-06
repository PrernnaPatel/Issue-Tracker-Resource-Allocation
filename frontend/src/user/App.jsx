//import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './layout/DashboardLayout';
import HomePage from './components/HomePage';
import RaiseTicket from './components/RaiseTicket';
import MyTicket from './components/MyTickets';
import AuthPage1 from './components/AuthPage1';
import Logout from './components/Logout';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Profile from './components/Profile';
import ChangePassword from './components/ChangePassword';
import TicketDetail from './components/TicketDetail';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<AuthPage1 />} />
        <Route path="/register" element={<AuthPage1 />} />
        <Route path="/logout" element={<Logout />} />

        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="raise-ticket" element={<RaiseTicket />} />
          <Route path="my-tickets" element={<MyTicket />} />
          <Route path="my-tickets/:ticketId" element={<TicketDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
};

export default App;