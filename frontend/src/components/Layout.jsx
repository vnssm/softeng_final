import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { FaFacebookF } from "react-icons/fa";
import "./Layout.css";

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

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-text">
            General Services Directorate
            <br />
            Mariano Marcos State University
          </div>

          <div className="footer-social" aria-label="MMSU social media">
            <a
              className="footer-social-item"
              href="https://www.facebook.com/mmsuosas"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="MMSU OSAS Facebook"
            >
              <FaFacebookF aria-hidden="true" />
              <small>@mmsuosas</small>
            </a>
            <a
              className="footer-social-item"
              href="https://www.facebook.com/MMSU.SirmataOfficial"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="MMSU Sirmata Official Facebook"
            >
              <FaFacebookF aria-hidden="true" />
              <small>@MMSU.SirmataOfficial</small>
            </a>
            <a
              className="footer-social-item"
              href="https://www.facebook.com/MMSUofficial/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="MMSU Official Facebook"
            >
              <FaFacebookF aria-hidden="true" />
              <small>@MMSUOfficial</small>
            </a>
            <a
              className="footer-social-item"
              href="https://www.facebook.com/MMSUUSC"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="MMSU USC Facebook"
            >
              <FaFacebookF aria-hidden="true" />
              <small>@MMSUUSC</small>
            </a>
          </div>

          <div className="footer-university">
            <img src="/mmsu-footer-logo.png" alt="MMSU Logo" />
            <small>
              Brgy. 16-S Quiling Sur, City of Batac
              <br />
              Ilocos Norte, Philippines 2906
            </small>
          </div>
        </div>

        <div className="footer-bottom">
          ©2026 Mariano Marcos State University. All Right Reserved
        </div>
      </footer>
    </div>
  );
}

export default Layout;