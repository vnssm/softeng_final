
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaLayerGroup, FaMapMarkerAlt } from "react-icons/fa";
import "./Assignments.css";

function Assignments() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssignments = async () => {
      const token = localStorage.getItem("token");

      try {
        const response = await fetch(
          "http://localhost:5000/api/assignments/my-assignments",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load assignments.");
        }

        const formattedAssignments = (data.assignments || []).map(
          (item) => {
            const scheduledTime =
              item.scheduled_time ||
              (item.date_needed && item.time_start
                ? `${String(item.date_needed).slice(0, 10)}T${item.time_start}`
                : null);

            return {
              ...item,
              name:
                item.facility_name ||
                item.equipment_names ||
                item.title ||
                `${item.request_type === "facility" ? "Facility" : "Equipment"} Request`,
              transactionStatus: (
                item.transaction_status || ""
              ).toLowerCase(),
              assignmentStatus: (
                item.assignment_status || "pending"
              ).toLowerCase(),
              requestId: item.request_code || item.request_id || "N/A",
              time: scheduledTime
                ? new Date(
                    String(scheduledTime).replace(" ", "T")
                  ).toLocaleString()
                : "Not scheduled",
              type:
                item.request_type === "facility"
                  ? "Facility"
                  : "Equipment",
              fulfillmentType: (
                item.fulfillment_type || ""
              ).toLowerCase(),
            };
          }
        );

        setAssignments(formattedAssignments);
      } catch (error) {
        console.error("Fetch assignments error:", error);
        setError(error.message || "Unable to load assignments.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // Filter using the transaction status.
  const filteredAssignments = assignments.filter((item) => {
    if (activeFilter === "all") {
      return true;
    }

    if (activeFilter === "pending") {
      return item.transactionStatus === "pending";
    }

    if (activeFilter === "assigned") {
      return item.transactionStatus === "approved";
    }

    if (activeFilter === "due") {
      return item.transactionStatus === "overdue";
    }

    return false;
  });

  const getStatusLabel = (item) => {
    if (item.transactionStatus === "approved") {
      return "Assigned";
    }

    if (item.transactionStatus === "overdue") {
      return "Due";
    }

    const status =
      item.transactionStatus || item.assignmentStatus;

    return status.replace(/_/g, " ").replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
  };

  const getStatusClass = (item) => {
    if (item.transactionStatus === "approved") return "assigned";
    if (item.transactionStatus === "overdue") return "due";

    return (item.transactionStatus || item.assignmentStatus)
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");
  };

  const isCompleted = (item) => {
    const completedStatuses = ["completed", "completed_with_issue"];
    return completedStatuses.includes(item.transactionStatus) ||
      completedStatuses.includes(item.assignmentStatus);
  };

  const openAssignment = (item) => {
    const status = item.transactionStatus;
    const filter = status === "pending"
      ? "pending"
      : ["returned", "completed", "completed_with_issue"].includes(status)
        ? "returns"
        : status === "overdue"
          ? "overdue"
          : "approved";

    navigate(`/personnel-requests?filter=${filter}`, {
      state: filter === "pending"
        ? { openRequestId: item.transaction_id }
        : undefined,
    });
  };

  return (
    <div className="assignments-page">
      <div className="page-header">
        <h1>My Assignments</h1>
        <p>View GSD transactions and their current statuses.</p>
      </div>

      <div className="filter-tabs">
        {["all", "assigned", "pending", "due"].map((filter) => (
          <button
            key={filter}
            type="button"
            className={`tab ${
              activeFilter === filter ? "active" : ""
            }`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      <div className="assignments-list">
        {loading ? (
          <div className="empty-state">Loading assignments...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="empty-state">
            No transactions found in this filter.
          </div>
        ) : (
          filteredAssignments.map((item) => {
            return (
              <div
                key={`${item.transaction_id || item.request_id}-${item.id || "unassigned"}`}
                className="assignment-card"
              >
                <div className="assignment-card-top">
                  <h3 className="assignment-card-title">{item.name}</h3>
                  <button
                    type="button"
                    className={`assignment-view-btn ${isCompleted(item) ? "disabled" : ""}`}
                    disabled={isCompleted(item)}
                    onClick={() => openAssignment(item)}
                  >
                    View
                  </button>
                </div>

                <div className="assignment-card-details">
                  <p>
                    <FaLayerGroup className="assignment-detail-icon" />
                    Purpose: {item.purpose || "No purpose provided"}
                  </p>
                  <p>
                    <FaMapMarkerAlt className="assignment-detail-icon" />
                    Location: {item.location || "Not specified"}
                  </p>
                  {item.time !== "Not scheduled" && (
                    <p>
                      <span className="assignment-detail-icon assignment-schedule-icon" />
                      Schedule: {item.time}
                    </p>
                  )}
                </div>

                <div className="assignment-card-divider" />

                <div className="assignment-card-bottom">
                  <span className="assignment-requested-by">
                    By {item.borrower_name || "Unknown Borrower"}
                  </span>
                  <span className={`assignment-status-badge ${getStatusClass(item)}`}>
                    <span className="assignment-status-dot" />
                    {getStatusLabel(item)}
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

export default Assignments;
