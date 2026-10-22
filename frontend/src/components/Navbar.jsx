
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaBell, FaChevronDown, FaBars } from "react-icons/fa";
import "./navbar.css";

const API_URL = "http://localhost:5000/api";

function Navbar({ onToggleSidebar }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(null);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Load the latest profile information
  async function loadNavbarProfile() {
    try {
      const token = localStorage.getItem("token");

      if (!token) return;

      const response = await fetch(API_URL + "/profile/me", {
        headers: {
          Authorization: "Bearer " + token
        }
      });

      const data = await response.json();

      if (response.ok && data.user) {
        setProfileUser(data.user);
      }
    } catch (error) {
      console.error("Failed to load navbar profile:", error);
    }
  }

  useEffect(() => {
    loadNavbarProfile();
  }, [location.pathname]);

  // Refresh the navbar when the profile picture changes
  useEffect(() => {
    function handleProfileUpdated() {
      loadNavbarProfile();
    }

    window.addEventListener("profileUpdated", handleProfileUpdated);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdated);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  
  const handleLogout = () => {
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (token) {
      fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch((error) => {
        console.error("Failed to record logout:", error);
      });
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

    setIsDropdownOpen(false);

    navigate("/login", { replace: true });
  };


  const isActive = (path) => location.pathname === path;

  const initials =
    (
      (profileUser?.first_name || "").charAt(0) +
      (profileUser?.last_name || "").charAt(0)
    ).toUpperCase() || "U";

  const profileImageUrl = profileUser?.profile_image
    ? profileUser.profile_image.startsWith("http")
      ? profileUser.profile_image
      : "http://localhost:5000" + profileUser.profile_image
    : "";

  return (
    <header className="navbar">
      {/* Left side */}
      <div className="navbar-left">
        <button
          className="sidebar-button"
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
          type="button"
        >
          <FaBars />
        </button>

        {/* Brand is no longer clickable */}
        <div className="navbar-brand">
          <img
            src="/mmsu-logo.png"
            alt="MMSU Logo"
            className="navbar-logo"
          />

          <div className="navbar-title">
            <div className="navbar-title-main">
              General Services Directorate
            </div>

            <div className="navbar-title-sub">
              Mariano Marcos State University
            </div>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="navbar-right">
        <Link
          to="/dashboard"
          className={`navbar-link ${
            isActive("/dashboard") ? "active" : ""
          }`}
        >
          Dashboard
        </Link>

        <Link
          to="/equipment"
          className={`navbar-link ${
            isActive("/equipment") ? "active" : ""
          }`}
        >
          Equipment
        </Link>

        <Link
          to="/facilities"
          className={`navbar-link ${
            isActive("/facilities") ? "active" : ""
          }`}
        >
          Facilities
        </Link>

        <div className="navbar-divider"></div>

        <Link to="/notifications" className="notification">
          <FaBell className="notification-icon" />
          <span className="notification-dot"></span>
        </Link>

        {/* Profile dropdown */}
        <div className="profile-dropdown" ref={dropdownRef}>
          <button
            className="profile-button"
            onClick={toggleDropdown}
            aria-label="Profile menu"
            type="button"
          >
            <div className="profile-circle">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="navbar-profile-image"
                />
              ) : (
                initials
              )}
            </div>

            <FaChevronDown className="profile-arrow" />
          </button>

          {isDropdownOpen && (
            <div className="dropdown-menu">
              <Link
                to="/profile"
                className="dropdown-item"
                onClick={() => setIsDropdownOpen(false)}
              >
                My Profile
              </Link>

              <button
                className="dropdown-item logout"
                onClick={handleLogout}
                type="button"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;