import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import "./layout.css"; // make sure this file exists

function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState("borrower");

  // Read the user role when the layout mounts
  useEffect(() => {
    const storedRole =
      localStorage.getItem("role") ||
      sessionStorage.getItem("role") ||
      "borrower";
    setRole(storedRole);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="layout">
      {/* Top Navbar */}
      <Navbar onToggleSidebar={toggleSidebar} />

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        role={role}
      />

      {/* Page Content */}
      <main className="layout-main">
        <Outlet />
      </main>

      {/* Optional Footer (you already have the CSS for it) */}
      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-text">
            General Services Directorate
            <br />
            Mariano Marcos State University
          </div>

          <div className="footer-university">
            <img src="/mmsu-logo.png" alt="MMSU Logo" />
            <small>
              Mariano Marcos State University
              <br />
              City of Batac, Ilocos Norte
            </small>
          </div>
        </div>

        <div className="footer-bottom">
          © {new Date().getFullYear()} MMSU – General Services Directorate. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default Layout;