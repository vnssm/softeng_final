import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Profile from "./pages/Profile"
import Dashboard from "./pages/Dashboard"
import Equipment from "./pages/Equipment"
import Facilities from "./pages/Facilities"
import Requests from "./pages/Requests"
import GSDRequests from "./pages/GSDRequests"
import UserManagement from "./pages/UserManagement"
import EquipmentManagement from "./pages/EquipmentManagement"
import FacilityManagement from "./pages/FacilityManagement"
import TransactionManagement from "./pages/TransactionManagement"
import Reports from "./pages/Reports"
import AuditLogs from "./pages/AuditLogs"
import SystemSettings from "./pages/SystemSettings"
import History from "./pages/History"
import Notifications from "./pages/Notifications"
import Assignments from "./pages/Assignments"
import ApprovedTransactions from "./pages/ApprovedTransactions"
import Layout from "./components/Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        <Route element={<Layout />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/personnel-requests" element={<GSDRequests />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/equipment-management" element={<EquipmentManagement />} />
          <Route path="/facility-management" element={<FacilityManagement />} />
          <Route path="/transaction-management" element={<TransactionManagement />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/system-settings" element={<SystemSettings />} />
          <Route path="/history" element={<History />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/approved-transactions" element={<ApprovedTransactions />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;