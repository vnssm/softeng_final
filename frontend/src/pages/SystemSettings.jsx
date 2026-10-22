import React, { useState, useEffect } from "react";
import {
  FaCog,
  FaBookmark,
  FaBell,
  FaShieldAlt,
  FaSave,
} from "react-icons/fa";

import GeneralProfile from "../components/SystemSettings/GeneralProfile";
import BorrowingPolicies from "../components/SystemSettings/BorrowingPolicies";
import NotificationRules from "../components/SystemSettings/NotificationRules";
import SecurityAccess from "../components/SystemSettings/SecurityAccess";

import "./UserManagement.css";
import "./SystemSettings.css";
import { API_URL } from "../config";

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState("general");

  const [generalData, setGeneralData] = useState({
    officeName: "General Services Directorate",
    contactEmail: "gsd@mmsu.edu.ph",
    operatingHours: "8:00 AM - 5:00 PM",
    campusLocation: "Batac City, Ilocos Norte",
  });

  const [policiesData, setPoliciesData] = useState({
    autoDetectConflicts: true,
    requireInspection: false,
    maxBorrowingDays: 67,
  });

  const [notificationData, setNotificationData] = useState({
    emailApprovalAlerts: true,
    returnDueReminders: false,
  });

  const [securityData, setSecurityData] = useState({
    roleBasedAccess: true,
    sessionTimeout: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load settings from the database
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Please log in again.");
        }

        const response = await fetch(
          `${API_URL}/system-settings`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load system settings."
          );
        }

        setGeneralData({
          officeName: data.officeName,
          contactEmail: data.contactEmail,
          operatingHours: data.operatingHours,
          campusLocation: data.campusLocation,
        });

        setPoliciesData({
          autoDetectConflicts: data.autoDetectConflicts,
          requireInspection: data.requireInspection,
          maxBorrowingDays: data.maxBorrowingDays,
        });
        setNotificationData({
          emailApprovalAlerts: data.emailApprovalAlerts,
          returnDueReminders: data.returnDueReminders,
        });

        setSecurityData({
          roleBasedAccess: data.roleBasedAccess,
          sessionTimeout: data.sessionTimeout,
        });
      } catch (err) {
        setError(err.message || "Failed to load system settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // General Profile input changes
  const handleGeneralChange = (e) => {
    const { name, value } = e.target;

    setGeneralData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  // Borrowing Policies input and toggle changes
  const handlePoliciesChange = (e) => {
    const { name, value, type, checked } = e.target;

    const newValue =
      type === "checkbox"
        ? checked
        : value;

    setPoliciesData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    setMessage("");
    setError("");
  };

  // Notification Rules changes
  const handleNotificationsChange = (e) => {
    const { name, value } = e.target;

    setNotificationData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  // Security & Access changes
  const handleSecurityChange = (e) => {
    const { name, value } = e.target;

    setSecurityData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  // Save the currently selected settings section
  const handleSave = async () => {
    setMessage("");
    setError("");
    setSaving(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      let settingsToSave = {};

      if (activeTab === "general") {
        settingsToSave = generalData;
      } else if (activeTab === "policies") {
        settingsToSave = {
          autoDetectConflicts: policiesData.autoDetectConflicts,
          requireInspection: policiesData.requireInspection,
          maxBorrowingDays: Number(policiesData.maxBorrowingDays),
        };
      } else if (activeTab === "notifications") {
        settingsToSave = notificationData;
      } else if (activeTab === "security") {
        settingsToSave = securityData;
      }

      // Validate General Profile
      if (activeTab === "general") {
        const officeName = generalData.officeName.trim();
        const contactEmail = generalData.contactEmail.trim();
        const operatingHours = generalData.operatingHours.trim();
        const campusLocation = generalData.campusLocation.trim();

        if (
          officeName === "" ||
          contactEmail === "" ||
          operatingHours === "" ||
          campusLocation === ""
        ) {
          throw new Error("Please complete all General Profile fields.");
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(contactEmail)) {
          throw new Error("Please enter a valid contact email.");
        }

        settingsToSave = {
          officeName,
          contactEmail,
          operatingHours,
          campusLocation,
        };
      }

      // Validate Borrowing Policies
      if (activeTab === "policies") {
        const days = Number(policiesData.maxBorrowingDays);

        if (
          policiesData.maxBorrowingDays === "" ||
          !Number.isInteger(days) ||
          days < 1 ||
          days > 365
        ) {
          throw new Error(
            "Maximum borrowing days must be a whole number from 1 to 365."
          );
        }

        settingsToSave.maxBorrowingDays = days;
      }

      const response = await fetch(
        `${API_URL}/system-settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(settingsToSave),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save settings.");
      }

      // Update the saved values in the selected section
      if (activeTab === "general") {
        setGeneralData({
          officeName: data.settings.officeName,
          contactEmail: data.settings.contactEmail,
          operatingHours: data.settings.operatingHours,
          campusLocation: data.settings.campusLocation,
        });
      } else if (activeTab === "policies") {
        setPoliciesData({
          autoDetectConflicts: data.settings.autoDetectConflicts,
          requireInspection: data.settings.requireInspection,
          maxBorrowingDays: data.settings.maxBorrowingDays,
        });
      } else if (activeTab === "notifications") {
          setNotificationData({
            emailApprovalAlerts: data.settings.emailApprovalAlerts,
            returnDueReminders: data.settings.returnDueReminders,
          });
        } else if (activeTab === "security") {
          setSecurityData({
            roleBasedAccess: data.settings.roleBasedAccess,
            sessionTimeout: data.settings.sessionTimeout,
          });
        }

      setMessage(data.message || "Settings saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <GeneralProfile
            formData={generalData}
            onChange={handleGeneralChange}
          />
        );

      case "policies":
        return (
          <BorrowingPolicies
            policiesData={policiesData}
            onChange={handlePoliciesChange}
          />
        );

      case "notifications":
        return (
          <NotificationRules
            notificationData={notificationData}
            onChange={handleNotificationsChange}
          />
        );

      case "security":
        return (
          <SecurityAccess
            securityData={securityData}
            onChange={handleSecurityChange}
          />
        );
      default:
        return null;
    }
  };

  const canSave = true;

  return (
    <div className="admin-page">
      <div className="settings-container">
        <div className="settings-header">
          <div>
            <h1>System Settings & Configuration</h1>
            <p>
              Manage global directorate parameters, operational policies, and
              access controls.
            </p>
          </div>

          <button
            className="save-changes-btn"
            onClick={handleSave}
            disabled={loading || saving || !canSave}
          >
            <FaSave />
            {loading
              ? "Loading..."
              : saving
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>

        {message && (
          <div className="settings-message settings-success">
            {message}
          </div>
        )}

        {error && (
          <div className="settings-message settings-error">
            {error}
          </div>
        )}

        <div className="settings-layout">
          <div className="settings-nav-card">
            <button
              className={`nav-tab-btn ${
                activeTab === "general" ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab("general");
                setMessage("");
                setError("");
              }}
            >
              <FaCog className="tab-icon" />
              General Profile
            </button>

            <button
              className={`nav-tab-btn ${
                activeTab === "policies" ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab("policies");
                setMessage("");
                setError("");
              }}
            >
              <FaBookmark className="tab-icon" />
              Borrowing Policies
            </button>

            <button
              className={`nav-tab-btn ${
                activeTab === "notifications" ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab("notifications");
                setMessage("");
                setError("");
              }}
            >
              <FaBell className="tab-icon" />
              Notification Rules
            </button>

            <button
              className={`nav-tab-btn ${
                activeTab === "security" ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab("security");
                setMessage("");
                setError("");
              }}
            >
              <FaShieldAlt className="tab-icon" />
              Security & Access
            </button>
          </div>

          <div className="settings-content-card">
            {loading ? (
              <p>Loading system settings...</p>
            ) : (
              renderTabContent()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}