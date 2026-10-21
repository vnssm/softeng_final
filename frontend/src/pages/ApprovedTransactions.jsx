
import React, { useCallback, useEffect, useState } from "react";
import "./ApprovedTransactions.css";

const APPROVED_STATUSES = new Set([
  "approved",
  "for_delivery",
  "for_pickup",
  "ongoing",
]);

function ApprovedTransactions() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/requests/requests",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load transactions.");
      }

      const requests = Array.isArray(data)
        ? data
        : data.requests || [];

<<<<<<< HEAD
      // Show approved requests only.
      const approvedRequests = requests.filter((request) => {
        const status = String(request.status || "").toLowerCase();
        return [
          "approved",
          "for_delivery",
          "for_pickup",
          "ongoing",
        ].includes(status);
      });
=======
      const approvedRequests = requests.filter((request) =>
        APPROVED_STATUSES.has(String(request.status || "").toLowerCase())
      );
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a

      setTransactions(approvedRequests);
    } catch (err) {
      setError(err.message || "Failed to load approved transactions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        loadTransactions();
      }
    };

    loadTransactions();
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("request-status-updated", loadTransactions);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("request-status-updated", loadTransactions);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadTransactions]);

  const filteredTransactions = transactions.filter((item) => {
    const requestType = String(
      item.type || item.request_type || ""
    ).toLowerCase();

    if (activeFilter === "all") {
      return true;
    }

    if (activeFilter === "equipment") {
      return requestType === "equipment";
    }

    if (activeFilter === "facilities") {
      return (
        requestType === "facility" ||
        requestType === "facilities"
      );
    }

    return true;
  });

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Date not specified";
    }

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timeValue) => {
    if (!timeValue) {
      return "Time not specified";
    }

    const parts = String(timeValue).split(":");
    const hour = Number(parts[0]);
    const minute = parts[1] || "00";

    if (isNaN(hour)) {
      return timeValue;
    }

    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute} ${period}`;
  };

  const getRequestName = (item) => {
    return (
      item.name ||
      item.equipment_names ||
      item.facility_name ||
      item.item ||
      "Request details unavailable"
    );
  };

  const getRequestType = (item) => {
    const type = String(
      item.type || item.request_type || ""
    ).toLowerCase();

    if (type === "facility" || type === "facilities") {
      return "Facilities";
    }

    return "Equipment";
  };

  return (
    <div className="approved-page">
      <div className="approved-header">
        <div>
          <h1>Approved Transactions</h1>
          <p>
            View approved equipment requests and facility reservations.
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={loadTransactions}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="approved-filter-tabs">
        <button
          className={`approved-tab ${
            activeFilter === "all" ? "active" : ""
          }`}
          onClick={() => setActiveFilter("all")}
        >
          All
        </button>

        <button
          className={`approved-tab ${
            activeFilter === "equipment" ? "active" : ""
          }`}
          onClick={() => setActiveFilter("equipment")}
        >
          Equipment
        </button>

        <button
          className={`approved-tab ${
            activeFilter === "facilities" ? "active" : ""
          }`}
          onClick={() => setActiveFilter("facilities")}
        >
          Facilities
        </button>
      </div>

      {loading ? (
        <div className="approved-empty-state">
          Loading approved transactions...
        </div>
      ) : error ? (
        <div className="approved-error">
          <p>{error}</p>
          <button onClick={loadTransactions}>Try Again</button>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="approved-empty-state">
          No approved transactions found.
        </div>
      ) : (
        <div className="approved-transactions-list">
          {filteredTransactions.map((item) => {
            const requestId =
              item.request_code || `Request #${item.id}`;

            const requester =
              item.requestedBy ||
              item.requester ||
              `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
              "Unknown requester";

            const department =
              item.college_department || item.college || "";

            const requestType = getRequestType(item);
            const statusLabel = String(item.status || "approved")
              .replace(/_/g, " ")
              .replace(/\b\w/g, (letter) => letter.toUpperCase());

            const dateNeeded =
              item.date_needed || item.dateNeeded;

            const startTime =
              item.time_start || item.time || "";

            const location =
              item.location || "Location not specified";

            return (
              <div
                key={item.id}
                className="approved-transaction-card"
              >
                <div className="approved-transaction-details">
                  <div className="approved-request-id">
                    {requestId}
                  </div>

                  <div className="approved-request-name">
                    {getRequestName(item)}
                  </div>

                  <div className="approved-request-meta">
                    <span>{requester}</span>

                    {department && (
                      <>
                        <span>•</span>
                        <span>{department}</span>
                      </>
                    )}

                    <span>•</span>
                    <span>{formatDate(dateNeeded)}</span>
                    <span>•</span>
                    <span>{formatTime(startTime)}</span>
                  </div>

                  <div className="approved-request-location">
                    {location}
                  </div>
                </div>

                <div className="approved-transaction-status">
                  <span
                    className={`approved-type-badge ${
                      requestType === "Equipment"
                        ? "equipment"
                        : "facility"
                    }`}
                  >
                    {requestType}
                  </span>

                  <span className="approved-status-badge">
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ApprovedTransactions;
