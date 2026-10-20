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
      <h2 className="notification-rules-title">Automated Notification Rules</h2>

      <div className="notifications-list">
        {/* Rule 1: Email Alerts on Transaction Approval */}
        <div
          className={`notification-card ${
            notificationData.emailApprovalAlerts ? "active" : ""
          }`}
          onClick={() => toggleSetting("emailApprovalAlerts")}
        >
          <div className="notification-info">
            <h3>Email Alerts on Transaction Approval</h3>
            <p>Notify borrowers instantly when GSD approves a reservation.</p>
          </div>
          <div className="notification-toggle">
            {notificationData.emailApprovalAlerts ? (
              <FaCheckCircle className="check-icon checked" />
            ) : (
              <FaRegCircle className="check-icon" />
            )}
          </div>
        </div>

        {/* Rule 2: SMS / Email Reminders for Return Due Date */}
        <div
          className={`notification-card ${
            notificationData.returnDueReminders ? "active" : ""
          }`}
          onClick={() => toggleSetting("returnDueReminders")}
        >
          <div className="notification-info">
            <h3>SMS / Email Reminders for Return Due Date</h3>
            <p>Send reminder 24 hours prior to equipment return deadline.</p>
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