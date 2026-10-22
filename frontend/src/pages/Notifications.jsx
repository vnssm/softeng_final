import React, { useEffect, useState } from "react";
import {
  FaBell,
  FaBoxOpen,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaFileAlt,
  FaSearch,
  FaSyncAlt
} from "react-icons/fa";
import "./Notifications.css";
import { API_URL } from "../config";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    setLoading(true);
    setError("");

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in to view your notifications.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/notifications/my-notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load notifications."
        );
      }

      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const getCategory = (notification) => {
    const type = (
      notification.type ||
      notification.event_type ||
      ""
    ).toLowerCase();

    if (type.includes("audit")) return "Audit Logs";

    if (
      type.includes("analytics") ||
      type.includes("system_report")
    ) {
      return "System Reports";
    }

    if (type.includes("system_settings")) {
      return "System Settings";
    }

    if (type.includes("equipment")) return "Equipment";
    if (type.includes("facility")) return "Facility";

    if (
      type.includes("reservation") ||
      type.includes("deadline") ||
      type.includes("due") ||
      type.includes("overdue") ||
      type.includes("request") ||
      type.includes("transaction")
    ) {
      return "Requests";
    }

    if (
      type.includes("account") ||
      type.includes("user_profile") ||
      type.includes("user_account")
    ) {
      return "Account";
    }

    return "Account";
  };

  const getIcon = (notification) => {
    const type = (
      notification.type ||
      notification.event_type ||
      ""
    ).toLowerCase();

    if (type.includes("audit")) return <FaFileAlt />;

    if (
      type.includes("analytics") ||
      type.includes("system_report")
    ) {
      return <FaFileAlt />;
    }

    if (type.includes("system_settings")) {
      return <FaSyncAlt />;
    }

    if (
      type.includes("maintenance") ||
      type.includes("unavailable")
    ) {
      return <FaExclamationTriangle />;
    }

    if (type.includes("equipment")) return <FaBoxOpen />;
    if (type.includes("facility")) return <FaBuilding />;

    if (
      type.includes("due") ||
      type.includes("overdue") ||
      type.includes("deadline")
    ) {
      return <FaClock />;
    }

    if (type.includes("reservation")) return <FaCalendarAlt />;
    if (type.includes("approved")) return <FaCheckCircle />;

    return <FaBell />;
  };

  const getPriority = (notification) => {
    const type = (
      notification.type ||
      notification.event_type ||
      ""
    ).toLowerCase();

    if (
      type.includes("overdue") ||
      type.includes("maintenance") ||
      type.includes("unavailable") ||
      type.includes("rejected")
    ) {
      return "important";
    }

    if (
      type.includes("due") ||
      type.includes("reminder") ||
      type.includes("upcoming")
    ) {
      return "reminder";
    }

    return "normal";
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "Date unavailable";

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const getTimeAgo = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) return "";

    const difference = Date.now() - date.getTime();
    const minutes = Math.floor(difference / 60000);

    if (minutes < 0) return "Upcoming";
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours} hr ago`;

    const days = Math.floor(hours / 24);

    if (days < 7) {
      return `${days} day${days === 1 ? "" : "s"} ago`;
    }

    return formatDate(dateValue);
  };

  const filteredNotifications = notifications.filter((item) => {
    const category = getCategory(item);

    const isUnread =
      item.is_read === 0 ||
      item.is_read === false ||
      item.is_read === "0";

    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "Unread" && isUnread) ||
      category === activeFilter;

    const searchText = (
      (item.title || "") +
      " " +
      (item.message || "") +
      " " +
      (item.type || item.event_type || "")
    ).toLowerCase();

    return matchesFilter && searchText.includes(search.toLowerCase());
  });

  const unreadCount = notifications.filter(
    (item) =>
      item.is_read === 0 ||
      item.is_read === false ||
      item.is_read === "0"
  ).length;

  return (
    <div className="notifications-page">
      <div className="notifications-heading">
        <div className="notifications-title-group">
          <div className="notifications-title-icon">
            <FaBell />
            {unreadCount > 0 && (
              <span className="notification-dot" />
            )}
          </div>

          <div>
            <h1>Notifications</h1>
            <p>
              Stay updated on requests, assignments, and important alerts.
            </p>
          </div>
        </div>

        <button
          className="notifications-refresh"
          onClick={loadNotifications}
          disabled={loading}
          type="button"
        >
          <FaSyncAlt />
          Refresh
        </button>
      </div>

      <div className="notifications-overview">
        <div className="notification-overview-icon">
          <FaBell />
        </div>

        <div>
          <h2>
            {unreadCount} unread{" "}
            {unreadCount === 1 ? "notification" : "notifications"}
          </h2>
          <p>
            Check your latest updates, reminders, and important alerts.
          </p>
        </div>
      </div>

      <div className="notifications-toolbar">
        <div className="notifications-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="notifications-filters">
          {[
            "All",
            "Unread",
            "Requests",
            "Equipment",
            "Facility",
            "Audit Logs",
            "System Reports",
            "System Settings",
            "Account"
          ].map((filter) => (
            <button
              key={filter}
              type="button"
              className={
                activeFilter === filter
                  ? "notification-filter active"
                  : "notification-filter"
              }
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="notifications-section-heading">
        <h2>Recent activity</h2>
        <span>{filteredNotifications.length} notifications</span>
      </div>

      <div className="notifications-list">
        {loading ? (
          <div className="notifications-empty">
            Loading your notifications...
          </div>
        ) : error ? (
          <div className="notifications-empty notifications-error">
            <FaExclamationTriangle />
            <p>{error}</p>
            <button type="button" onClick={loadNotifications}>
              Try Again
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notifications-empty">
            <FaBell className="empty-notification-icon" />
            <h3>You're all caught up!</h3>
            <p>
              New request updates, reminders, and availability alerts will
              appear here when they are generated.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isUnread =
              item.is_read === 0 ||
              item.is_read === false ||
              item.is_read === "0";

            const priority = getPriority(item);

            return (
              <div
                className={`notification-card ${isUnread ? "unread" : ""}`}
                key={item.id}
              >
                <div className={`notification-card-icon ${priority}`}>
                  {getIcon(item)}
                </div>

                <div className="notification-card-content">
                  <div className="notification-card-top">
                    <h3>{item.title || "System Notification"}</h3>

                    {isUnread && (
                      <span className="notification-unread-label">
                        New
                      </span>
                    )}
                  </div>

                  <p className="notification-message">
                    {item.message}
                  </p>

                  <div className="notification-card-footer">
                    <span className="notification-date">
                      {formatDate(item.created_at)}
                    </span>

                    <span className="notification-time">
                      {getTimeAgo(item.created_at)}
                    </span>
                  </div>
                </div>

                {isUnread && (
                  <span className="notification-unread-dot" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Notifications;