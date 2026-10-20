
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
          (item) => ({
            ...item,
            transactionStatus: (
              item.transaction_status || ""
            ).toLowerCase(),
            assignmentStatus: (
              item.assignment_status || "pending"
            ).toLowerCase(),
            requestId: item.request_code || item.request_id || "N/A",
            time: item.scheduled_time
              ? new Date(item.scheduled_time).toLocaleString()
              : "Not scheduled",
            type:
              item.request_type === "facility"
                ? "Facility"
                : "Equipment",
            fulfillmentType: (
              item.fulfillment_type || ""
            ).toLowerCase(),
          })
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

  const getFulfillmentLabel = (item) => {
    if (item.fulfillmentType === "pickup") {
      return "Pickup";
    }

    if (item.fulfillmentType === "delivery") {
      return "Delivery";
    }

    return "";
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
            const fulfillmentLabel = getFulfillmentLabel(item);
            const isAssigned =
              item.transactionStatus === "approved";
            const statusClass = isAssigned
              ? "assigned"
              : item.transactionStatus === "overdue"
                ? "due"
                : item.transactionStatus;

            return (
              <div
                key={`${item.transaction_id || item.request_id}-${item.id || "unassigned"}`}
                className="assignment-card"
              >
                <div className="assignment-left">
                  <div className="assignment-title">
                    {item.title ||
                      `${item.type} Request`}
                  </div>

                  <div className="assignment-meta">
                    <span>Request #{item.requestId}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                    <span>•</span>
                    <span>
                      {item.location || "No location specified"}
                    </span>
                  </div>

                  <div className="assignment-type">
                    {item.type}
                  </div>
                </div>

                
                <div className="assignment-right">
                  <span className={`status ${statusClass}`}>
                    {getStatusLabel(item)}
                  </span>

                  {isAssigned && fulfillmentLabel && (
                    <div className="assignment-fulfillment">
                      {fulfillmentLabel}
                    </div>
                  )}

                  {item.transactionStatus === "pending" && (
                    <button
                      type="button"
                      className="assignment-view-btn"
                      onClick={() =>
                        navigate("/personnel-requests?filter=pending", {
                          state: {
                            openRequestId: item.transaction_id,
                          },
                        })
                      }
                    >
                      View
                    </button>
                  )}
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
