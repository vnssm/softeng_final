import React from "react";
import { FaCheckCircle, FaRegCircle } from "react-icons/fa";
import "./NotificationRules.css";

export default function NotificationRules({ notificationData, onChange }) {
  const toggleSetting = (key) => {
    onChange({
      target: {
        name: key,
        value: !notificationData[key],
      },
    });
  };

  return (
    <div className="notification-rules-pane">
      <h2 className="notification-rules-title">
        Automated Notification Rules
      </h2>

      <div className="notifications-list">
        {/* Email Approval Alerts */}
        <div
          className={`notification-card ${
            notificationData.emailApprovalAlerts ? "active" : ""
          }`}
          role="button"
          tabIndex={0}
          aria-pressed={Boolean(notificationData.emailApprovalAlerts)}
          onClick={() => toggleSetting("emailApprovalAlerts")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleSetting("emailApprovalAlerts");
            }
          }}
        >
          <div className="notification-info">
            <h3>Email Alerts on Transaction Approval</h3>
            <p>
              Notify borrowers when GSD approves a reservation.
            </p>
          </div>

          <div className="notification-toggle">
            {notificationData.emailApprovalAlerts ? (
              <FaCheckCircle className="check-icon checked" />
            ) : (
              <FaRegCircle className="check-icon" />
            )}
          </div>
        </div>

        {/* Return Due Reminders */}
        <div
          className={`notification-card ${
            notificationData.returnDueReminders ? "active" : ""
          }`}
          role="button"
          tabIndex={0}
          aria-pressed={Boolean(notificationData.returnDueReminders)}
          onClick={() => toggleSetting("returnDueReminders")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleSetting("returnDueReminders");
            }
          }}
        >
          <div className="notification-info">
            <h3>SMS / Email Reminders for Return Due Date</h3>
            <p>
              Send a reminder 24 hours before the equipment return deadline.
            </p>
          </div>

          <div className="notification-toggle">
            {notificationData.returnDueReminders ? (
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