import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './components/authPage';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { DeptAuthProvider } from './context/DeptAuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import DeptProtectedRoute from './components/DeptProtectedRoute';
import AdminDashboard from './components/AdminDashboard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Employee from './pages/Employee';
import EmployeeDetail from './pages/EmployeeDetail';
import Tickets from './pages/Tickets.jsx';
import Departments from './pages/Departments';
import Building from './pages/Buildings';
import Reports from './pages/Reports';
import DepartmentalAdmins from './pages/DepartmentalAdmins';
import TicketDetail from './pages/TicketDetail';
import AdminLayout from './layout/AdminLayout';
import DeptDashboard from './pages/Dept/Dashboard';
import DepartmentTickets from './pages/Dept/Tickets';
import DeptReports from './pages/Dept/Reports';
import DepartmentTicketDetail from './pages/Dept/TicketDetail';
import TicketAssigned from './pages/Dept/TicketAssigned';
import DepartmentLayout from './layout/DepartmentLayout';
import { DeptSocketProvider } from './context/DeptSocketContext';
import Inventory from './pages/Dept/Inventory';
import InventoryProtectedRoute from './components/InventoryProtectedRoute';
import InventoryDetail from './pages/Dept/InventoryDetail';
import ComponentSets from './pages/ComponentSets';
import Logs from './pages/Logs';

// Admin Routes Component
const AdminRoutes = () => {
  return (
    <div className="flex h-screen bg-[#0B1426]">
      <div className="flex-1 flex flex-col">
        <AdminLayout>
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/employee" element={<Employee />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/employee/:id" element={<EmployeeDetail />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/buildings" element={<Building />} />
            <Route path="/departmental-admins" element={<DepartmentalAdmins />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/tickets/:ticketId" element={<TicketDetail />} />
            <Route path="/admin/inventory/:id" element={<InventoryDetail />} />
            <Route path="/component-sets" element={<ComponentSets />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </main>
        </AdminLayout>
      </div>
    </div>
  );
};

// Auth Routes Component
const AuthRoutes = () => {
  return (
    <Routes>
      <Route path="/admin-login" element={<AuthPage />} />
      <Route path="/dept-login" element={<AuthPage />} />
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/admin-login" replace />} />

        {/* Auth Routes */}
        <Route path="/*" element={<AuthRoutes />} />

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <AdminAuthProvider>
              <ProtectedRoute>
                <AdminRoutes />
              </ProtectedRoute>
            </AdminAuthProvider>
          }
        />

        {/* Departmental Admin Routes */}
        <Route
          path="/dept"
          element={
            <DeptAuthProvider>
              <NotificationProvider>
                <DeptSocketProvider>
                  <DeptProtectedRoute>
                    <DepartmentLayout />
                  </DeptProtectedRoute>
                </DeptSocketProvider>
              </NotificationProvider>
            </DeptAuthProvider>
          }
        >
          <Route
            path="dashboard"
            element={
              <div>
                <DeptDashboard />
              </div>
            }
          />
          <Route
            path="tickets"
            element={<DepartmentTickets />}
          />
          <Route
            path="tickets/:ticketId"
            element={<DepartmentTicketDetail />}
          />
          <Route
            path="reports"
            element={<DeptReports />}
          />
          <Route
            path="ticket-assigned"
            element={<TicketAssigned />}
          />
          <Route
            path="inventory"
            element={
              <InventoryProtectedRoute>
                <Inventory />
              </InventoryProtectedRoute>
            }
          />
          <Route
            path="inventory/:id"
            element={<InventoryDetail />}
          />
          <Route
            path="*"
            element={
              <div>
                <p>Fallback route matched</p>
                <Navigate to="/dept/dashboard" replace />
              </div>
            }
          />
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/admin-login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;