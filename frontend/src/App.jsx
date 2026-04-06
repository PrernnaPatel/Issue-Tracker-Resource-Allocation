import { Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import UnifiedLoginPage from "./components/UnifiedLoginPage";
import EmployeeRegistrationPage from "./components/EmployeeRegistrationPage";
import Logout from "./user/components/Logout";
import UserProtectedRoute from "./user/components/ProtectedRoute";
import DashboardLayout from "./user/layout/DashboardLayout";
import HomePage from "./user/components/HomePage";
import RaiseTicket from "./user/components/RaiseTicket";
import MyTicket from "./user/components/MyTickets";
import Profile from "./user/components/Profile";
import ChangePassword from "./user/components/ChangePassword";
import UserTicketDetail from "./user/components/TicketDetail";
import { AdminAuthProvider } from "./admin/context/AdminAuthContext";
import { DeptAuthProvider } from "./admin/context/DeptAuthContext";
import { NotificationProvider } from "./admin/context/NotificationContext";
import { DeptSocketProvider } from "./admin/context/DeptSocketContext";
import AdminProtectedRoute from "./admin/components/ProtectedRoute";
import DeptProtectedRoute from "./admin/components/DeptProtectedRoute";
import InventoryProtectedRoute from "./admin/components/InventoryProtectedRoute";
import AdminLayout from "./admin/layout/AdminLayout";
import DepartmentLayout from "./admin/layout/DepartmentLayout";
import AdminDashboard from "./admin/components/AdminDashboard";
import Employee from "./admin/pages/Employee";
import EmployeeDetail from "./admin/pages/EmployeeDetail";
import Tickets from "./admin/pages/Tickets";
import Departments from "./admin/pages/Departments";
import Buildings from "./admin/pages/Buildings";
import Reports from "./admin/pages/Reports";
import DepartmentalAdmins from "./admin/pages/DepartmentalAdmins";
import NetworkEngineers from "./admin/pages/NetworkEngineers";
import AdminTicketDetail from "./admin/pages/TicketDetail";
import Inventory from "./admin/pages/Dept/Inventory";
import InventoryDetail from "./admin/pages/Dept/InventoryDetail";
import ComponentSets from "./admin/pages/ComponentSets";
import Logs from "./admin/pages/Logs";
import DeptDashboardRoute from "./admin/pages/Dept/DashboardRoute";
import DepartmentTickets from "./admin/pages/Dept/Tickets";
import DepartmentTicketDetail from "./admin/pages/Dept/TicketDetail";
import NetworkEngineerTicketDetail from "./admin/pages/Dept/NetworkEngineerTicketDetail";
import DeptReports from "./admin/pages/Dept/Reports";
import DeptNetworkEngineers from "./admin/pages/Dept/NetworkEngineers";
import TicketAssigned from "./admin/pages/Dept/TicketAssigned";
import TicketOptions from "./admin/pages/Dept/TicketOptions";
import DeptProfile from "./admin/pages/Dept/Profile";
import DeptChangePassword from "./admin/pages/Dept/ChangePassword";

const AdminRoutes = () => (
  <div className="flex h-screen bg-[#0B1426]">
    <div className="flex flex-1 flex-col">
      <AdminLayout>
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/employee" element={<Employee />} />
            <Route path="/employee/:id" element={<EmployeeDetail />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/:ticketId" element={<AdminTicketDetail />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/buildings" element={<Buildings />} />
            <Route path="/departmental-admins" element={<DepartmentalAdmins />} />
            <Route path="/network-engineers" element={<NetworkEngineers />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/admin/inventory/:id" element={<InventoryDetail />} />
            <Route path="/component-sets" element={<ComponentSets />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="*" element={<Navigate replace to="/admin/dashboard" />} />
          </Routes>
        </main>
      </AdminLayout>
    </div>
  </div>
);

const App = () => {
  return (
    <>
      <ToastContainer
        autoClose={4000}
        closeOnClick
        draggable
        hideProgressBar={false}
        newestOnTop
        pauseOnFocusLoss
        pauseOnHover
        position="top-right"
        rtl={false}
      />

      <Routes>
        <Route path="/login" element={<UnifiedLoginPage />} />
        <Route path="/admin-login" element={<Navigate replace to="/login" />} />
        <Route path="/dept-login" element={<Navigate replace to="/login" />} />
        <Route path="/register" element={<EmployeeRegistrationPage />} />
        <Route path="/logout" element={<Logout />} />

        <Route
          path="/admin/*"
          element={
            <AdminAuthProvider>
              <AdminProtectedRoute>
                <AdminRoutes />
              </AdminProtectedRoute>
            </AdminAuthProvider>
          }
        />

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
          <Route path="dashboard" element={<DeptDashboardRoute />} />
          <Route path="tickets" element={<DepartmentTickets />} />
          <Route path="tickets/:ticketId" element={<DepartmentTicketDetail />} />
          <Route path="my-tickets/:ticketId" element={<NetworkEngineerTicketDetail />} />
          <Route path="reports" element={<DeptReports />} />
          <Route path="network-engineers" element={<DeptNetworkEngineers />} />
          <Route path="ticket-assigned" element={<TicketAssigned />} />
          <Route path="options" element={<TicketOptions />} />
          <Route
            path="inventory"
            element={
              <InventoryProtectedRoute>
                <Inventory />
              </InventoryProtectedRoute>
            }
          />
          <Route path="inventory/:id" element={<InventoryDetail />} />
          <Route path="profile" element={<DeptProfile />} />
          <Route path="change-password" element={<DeptChangePassword />} />
          <Route path="*" element={<Navigate replace to="/dept/dashboard" />} />
        </Route>

        <Route
          path="/"
          element={
            <UserProtectedRoute>
              <DashboardLayout />
            </UserProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="raise-ticket" element={<RaiseTicket />} />
          <Route path="my-tickets" element={<MyTicket />} />
          <Route path="my-tickets/:ticketId" element={<UserTicketDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>

        <Route path="*" element={<Navigate replace to="/login" />} />
      </Routes>
    </>
  );
};

export default App;
