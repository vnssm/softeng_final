import React from "react";
import { FaCheckCircle, FaRegCircle } from "react-icons/fa";
import "./SecurityAccess.css";

export default function SecurityAccess({ securityData, onChange }) {
  const toggleSetting = (key) => {
    onChange({
      target: {
        name: key,
        value: !securityData[key],
      },
    });
  };

  return (
    <div className="security-access-pane">
      <h2 className="security-access-title">
        Security & Access Control
      </h2>

      <div className="security-list">
        {/* Role-Based Access Control */}
        <div
          className={`security-card ${
            securityData.roleBasedAccess ? "active" : ""
          }`}
          role="button"
          tabIndex={0}
          aria-pressed={Boolean(securityData.roleBasedAccess)}
          onClick={() => toggleSetting("roleBasedAccess")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleSetting("roleBasedAccess");
            }
          }}
        >
          <div className="security-info">
            <h3>Role-Based Access Control</h3>
            <p>
              Manage system access based on user roles such as Borrower,
              GSD Personnel, and Administrator.
            </p>
          </div>

          <div className="security-toggle">
            {securityData.roleBasedAccess ? (
              <FaCheckCircle className="check-icon checked" />
            ) : (
              <FaRegCircle className="check-icon" />
            )}
          </div>
        </div>

        {/* Session Timeout */}
        <div
          className={`security-card ${
            securityData.sessionTimeout ? "active" : ""
          }`}
          role="button"
          tabIndex={0}
          aria-pressed={Boolean(securityData.sessionTimeout)}
          onClick={() => toggleSetting("sessionTimeout")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleSetting("sessionTimeout");
            }
          }}
        >
          <div className="security-info">
            <h3>Session Timeout</h3>
            <p>
              Automatically log out inactive users after a period of
              inactivity to protect account security.
            </p>
          </div>

          <div className="security-toggle">
            {securityData.sessionTimeout ? (
              <FaCheckCircle className="check-icon checked" />
            ) : (
              <FaRegCircle className="check-icon" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}