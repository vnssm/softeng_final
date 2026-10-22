import React, { useEffect, useState } from "react";
import {
  FaHistory,
  FaSearch,
  FaUserEdit,
  FaBoxOpen,
  FaBuilding,
  FaClipboardList,
  FaUser,
  FaSyncAlt
} from "react-icons/fa";
import "./History.css";

const API_URL = "http://localhost:5000/api";

function History() {
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Activities");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadActivities = async () => {
    setLoading(true);
    setError("");

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in to view your activity history.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/activities/my-activities`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load activities.");
      }

      setActivities(data.activities || []);
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const getCategory = (actionType) => {
    const action = (actionType || "").toLowerCase();

    if (action.includes("profile")) return "Profile";
    if (action.includes("equipment")) return "Equipment";
    if (action.includes("facility")) return "Facility";

    if (
      action.includes("request") ||
      action.includes("reservation") ||
      action.includes("cancel")
    ) {
      return "Requests";
    }

    return "Account";
  };

  const getIcon = (category) => {
    if (category === "Profile") return <FaUserEdit />;
    if (category === "Equipment") return <FaBoxOpen />;
    if (category === "Facility") return <FaBuilding />;
    if (category === "Requests") return <FaClipboardList />;

    return <FaUser />;
  };

  const formatAction = (actionType) => {
    const actionLabels = {
      system_settings_updated: "System Settings Updated",
      audit_logs_viewed: "Viewed Audit Logs",
      audit_logs_exported: "Audit Logs Exported",
      csv_exported: "CSV Exported",
      system_report_exported: "System Report Exported",
      weekly_system_report_exported: "Weekly System Report Exported",
      weekly_audit_logs_exported: "Weekly Audit Logs Exported",
      transaction_removed: "Transaction Removed",
      equipment_request: "Equipment Request Submitted",
      equipment_return: "Equipment Returned",
      facility_reservation: "Facility Reservation Submitted",
      request_approved: "Request Approved",
      request_rejected: "Request Rejected",
      return_inspected: "Returned Equipment Inspected"
    };

    if (!actionType) {
      return "Account Activity";
    }

    if (actionLabels[actionType]) {
      return actionLabels[actionType];
    }

    return actionType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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

  const filteredActivities = activities.filter((activity) => {
    const category = getCategory(activity.action_type);

    const matchesFilter =
      activeFilter === "All Activities" || category === activeFilter;

    const searchText = (
      (activity.description || "") +
      " " +
      (activity.action_type || "") +
      " " +
      category
    ).toLowerCase();

    const matchesSearch = searchText.includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="history-page">
      <div className="history-header">
        <div className="history-heading">
          <div className="history-heading-icon">
            <FaHistory />
          </div>

          <div>
            <h1>Activity History</h1>
            <p>Review the activities you have done in your account.</p>
          </div>
        </div>

        <button
          type="button"
          className="history-refresh-btn"
          onClick={loadActivities}
          disabled={loading}
        >
          <FaSyncAlt />
          Refresh
        </button>
      </div>

      <div className="history-toolbar">
        <div className="history-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search activities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="history-filter"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option>All Activities</option>
          <option>Profile</option>
          <option>Equipment</option>
          <option>Facility</option>
          <option>Requests</option>
          <option>Account</option>
        </select>
      </div>

      <div className="history-list">
        {loading ? (
          <div className="history-message">
            Loading your activity history...
          </div>
        ) : error ? (
          <div className="history-message history-error">
            <p>{error}</p>
            <button type="button" onClick={loadActivities}>
              Try Again
            </button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="history-empty">
            <FaHistory />
            <h3>No activities found</h3>
            <p>
              {activities.length === 0
                ? "Your activities will appear here when you use the system."
                : "Try another search term or activity filter."}
            </p>
          </div>
        ) : (
          filteredActivities.map((activity) => {
            const category = getCategory(activity.action_type);

            return (
              <div className="history-item" key={activity.id}>
                <div className={`history-item-icon ${category.toLowerCase()}`}>
                  {getIcon(category)}
                </div>

                <div className="history-item-content">
                  <div className="history-item-top">
                    <span className="history-action">
                      {formatAction(activity.action_type)}
                    </span>

                    <span className="history-category">
                      {category}
                    </span>
                  </div>

                  <p className="history-description">
                    {activity.description}
                  </p>

                  <span className="history-date">
                    {formatDate(activity.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default History;