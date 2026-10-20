import React, { useState } from "react";
import BorrowerDashboard from "../components/dashboard/BorrowerDashboard"
import GSDDashboard from "../components/dashboard/GSDDashboard"
import AdminDashboard from "../components/dashboard/AdminDashboard";

function Dashboard() {
  // Read role from localStorage (same as Layout)
  const role = localStorage.getItem("role") || "borrower";

  return (
    <div>
      {role === "borrower" && <BorrowerDashboard />}
      {role === "personnel" && <GSDDashboard />}
      {role === "admin" && <AdminDashboard />}
    </div>
  );
}

export default Dashboard;