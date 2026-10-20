
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./sidebar.css";

function Sidebar({ isOpen, onClose, role = "borrower" }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Menu items for each user role
  const menus = {
    borrower: [
      { path: "/dashboard", label: "Dashboard" },
      { path: "/equipment", label: "Borrow Equipment" },
      { path: "/facilities", label: "Reserve Facility" },
      { path: "/requests", label: "My Requests" },
      { path: "/history", label: "History" },
      { path: "/notifications", label: "Notifications" },
      { path: "/profile", label: "Profile" },
    ],

    personnel: [
      { path: "/dashboard", label: "Dashboard" },
      { path: "/personnel-requests?filter=pending", label: "Pending Requests" },
      { path: "/approved-transactions", label: "Approved Requests" },
      { path: "/personnel-requests?filter=returns", label: "Returns" },
      { path: "/personnel-requests?filter=overdue", label: "Overdue" },
      { path: "/assignments", label: "My Assignments" },
      { path: "/notifications", label: "Notifications" },
      { path: "/profile", label: "Profile" },
    ],

    admin: [
      { path: "/dashboard", label: "Dashboard" },
      { path: "/user-management", label: "User Management" },
      { path: "/equipment-management", label: "Equipment Management" },
      { path: "/facility-management", label: "Facility Management" },
      { path: "/transaction-management", label: "Transaction Management" },
      { path: "/reports", label: "Reports" },
      { path: "/audit-logs", label: "Audit Logs" },
      { path: "/system-settings", label: "System Settings" },
    ],
  };

  const menuItems = menus[role] || menus.borrower;

  // Check active state, including query parameters
  const isActive = (path) => {
    if (path.includes("?")) {
      return location.pathname + location.search === path;
    }

    return location.pathname === path;
  };

  // Record logout before clearing the login token
  const handleLogout = async () => {
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (token) {
      try {
        const response = await fetch(
          "http://localhost:5000/api/auth/logout",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          console.error("Failed to record logout.");
        }
      } catch (error) {
        console.error("Logout audit request failed:", error);
      }
    }

    // Clear saved login information
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("isLoggedIn");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("isLoggedIn");

    onClose();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* Background overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2>Menu</h2>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-menu">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${
                  isActive(item.path) ? "active" : ""
                }`}
                onClick={onClose}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-link logout-link"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
