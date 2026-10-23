
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import "./Requests.css";
import { FaLayerGroup, FaMapMarkerAlt, FaCalendarAlt } from "react-icons/fa";
import { API_URL } from "../config";

const hiddenRequestStatuses = new Set([
  "return",
  "returned",
  "completed",
  "completed_with_issue",
]);

function isVisibleRequest(item) {
  const status = String(item.status || "")
    .trim()
    .toLowerCase()
    .replaceAll(/[ -]+/g, "_");

  return !hiddenRequestStatuses.has(status);
}

function Requests() {
  const navigate = useNavigate();

  const role = localStorage.getItem("role") || "borrower";

  const [activeTab, setActiveTab] = useState("Equipment");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [equipmentRequests, setEquipmentRequests] = useState([]);
  const [facilityRequests, setFacilityRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [returningId, setReturningId] = useState(null);
  const [returnMessage, setReturnMessage] = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setError("Please log in again to view your requests.");
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [equipmentResponse, facilityResponse] = await Promise.all([
          fetch(`${API_URL}/borrowing/my-requests`, {
            headers,
          }),
          fetch(`${API_URL}/reservations/my-reservations`, {
            headers,
          }),
        ]);

        const equipmentData = await equipmentResponse.json();
        const facilityData = await facilityResponse.json();

        if (!equipmentResponse.ok) {
          throw new Error(
            equipmentData.message || "Failed to load equipment requests."
          );
        }

        if (!facilityResponse.ok) {
          throw new Error(
            facilityData.message || "Failed to load facility reservations."
          );
        }

        setEquipmentRequests(
          (equipmentData.requests || [])
            .filter(isVisibleRequest)
            .map((item) => ({
              ...item,
              name: item.equipment_name || "Equipment",
              type: "Equipment",
            }))
        );

        setFacilityRequests(
          (facilityData.reservations || [])
            .filter(isVisibleRequest)
            .map((item) => ({
              ...item,
              name: item.facility_name || "Facility",
              type: "Facility",
            }))
        );
      } catch (err) {
        console.error("My Requests error:", err);
        setError(err.message || "Unable to load your requests.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  
  const handleReturn = async (item) => {
    const confirmed = window.confirm(
      `Do you want to return this ${item.type === "Facility" ? "facility reservation" : "equipment request"}?`
    );

    if (!confirmed) {
      return;
    }

    setReturningId(item.id);
    setReturnMessage("");

    try {
      const token = localStorage.getItem("token");

      const endpoint =
        item.type === "Equipment"
          ? `${API_URL}/borrowing/my-requests/${item.id}/return`
          : `${API_URL}/reservations/my-reservations/${item.id}/return`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to return request.");
      }

      if (item.type === "Equipment") {
        setEquipmentRequests((requests) =>
          requests.filter((request) => request.id !== item.id)
        );
      } else {
        setFacilityRequests((requests) =>
          requests.filter((request) => request.id !== item.id)
        );
      }

      setReturnMessage(
        "Return submitted successfully."
      );
    } catch (err) {
      setReturnMessage(err.message || "Unable to return request.");
    } finally {
      setReturningId(null);
    }
  };


  if (role !== "borrower") {
    return <Navigate to="/dashboard" replace />;
  }

  // Display database statuses in a user-friendly format
  const getStatusLabel = (status) => {
    return status
      ? status
          .toLowerCase()
          .replaceAll(/[ -]+/g, "_")
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : "Unknown";
  };

  const getStatusClass = (status) => {
    if (status === "pending") return "under-review";

    return status ? status.toLowerCase().replaceAll("_", "-") : "unknown";
  };

  const formatDate = (value) => {
    if (!value) return "";

    const dateString = String(value).slice(0, 10);
    const parts = dateString.split("-");

    if (parts.length !== 3) return dateString;

    const date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    return value ? String(value).slice(0, 5) : "";
  };

  const formatDateRange = (item) => {
    const startDate = formatDate(item.date_needed);
    const endDate = formatDate(item.date_end);

    if (!startDate) return "Date not available";

    if (endDate && String(item.date_needed).slice(0, 10) !== String(item.date_end).slice(0, 10)) {
      return `${startDate} - ${endDate}`;
    }

    return startDate;
  };

  const formatTimeRange = (item) => {
    const startTime = formatTime(item.time_start);
    const endTime = formatTime(item.time_end);

    if (!startTime) return "Time not available";

    return `${startTime}${endTime ? ` - ${endTime}` : ""}`;
  };

  const currentList =
    activeTab === "Equipment" ? equipmentRequests : facilityRequests;

  const filtered = currentList.filter((item) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      (item.name || "").toLowerCase().includes(searchText) ||
      (item.request_code || "").toLowerCase().includes(searchText) ||
      (item.purpose || "").toLowerCase().includes(searchText) ||
      (item.location || "").toLowerCase().includes(searchText);

    const statusLabel = getStatusLabel(item.status);

    const matchesStatus =
      statusFilter === "All" ||
      statusLabel === getStatusLabel(statusFilter);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="requests-page">
      <div className="requests-card">
        {/* Header */}
        <div className="requests-header">
          <div>
            <h1>My Requests</h1>
            <p>Track your equipment requests and facility reservations.</p>
          </div>

          <button
            className="close-btn"
            onClick={() => navigate("/dashboard")}
            type="button"
          >
            ×
          </button>
        </div>

        {/* Tabs and Filters */}
        <div className="requests-filters">
          <div className="tabs">
            <button
              type="button"
              className={`tab ${activeTab === "Equipment" ? "active" : ""}`}
              onClick={() => setActiveTab("Equipment")}
            >
              Equipment ({equipmentRequests.length})
            </button>

            <button
              type="button"
              className={`tab ${activeTab === "Facilities" ? "active" : ""}`}
              onClick={() => setActiveTab("Facilities")}
            >
              Facilities ({facilityRequests.length})
            </button>
          </div>

          <div className="filter-right">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-select"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Returned">Returned</option>
              <option value="Completed">Completed</option>
              <option value="Completed With Issue">Completed With Issue</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <div className="search-box">
              <input
                type="text"
                placeholder="Search requests"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        { returnMessage && (
          <p className="return-message" role="status">
            {returnMessage}
          </p>
        )}

        {/* Request List */}
        <div className="requests-list">
          {loading ? (
            <div className="empty-state">Loading your requests...</div>
          ) : error ? (
            <div className="empty-state error-message">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              No {activeTab.toLowerCase()} requests found.
            </div>
          ) : (
            filtered.map((item) => (
              <div key={`${item.type}-${item.id}`} className="request-card">
                <div className="card-top">
                  <div>
                    <h3 className="card-title">{item.name}</h3>
                    <span className="request-code">
                      {item.request_code}
                    </span>
                  </div>

                  <div
                    className={`status-badge ${getStatusClass(item.status)}`}
                  >
                    <span className="dot"></span>
                    {getStatusLabel(item.status)}
                  </div>
                </div>

                <div className="card-details">
                  <p>
                    <FaLayerGroup className="detail-icon" />
                    <span>
                      <strong>Purpose:</strong> {item.purpose || "Not specified"}
                    </span>
                  </p>

                  <p>
                    <FaMapMarkerAlt className="detail-icon" />
                    <span>
                      <strong>Location:</strong> {item.location || "Not specified"}
                    </span>
                  </p>

                  {item.quantity !== undefined && (
                    <p>
                      <FaLayerGroup className="detail-icon" />
                      <span>
                        <strong>Quantity:</strong> {item.quantity}
                      </span>
                    </p>
                  )}

                  <p>
                    <FaCalendarAlt className="detail-icon" />
                    <span>
                      <strong>Date:</strong> {formatDateRange(item)}
                    </span>
                  </p>
                </div>

                <div className="card-divider"></div>

                <div className="card-bottom">
                  <span className="requested-by">
                    {item.type === "Equipment"
                      ? item.fulfillment_type
                        ? `Request type: ${item.fulfillment_type}`
                        : "Equipment Borrowing"
                      : "Facility Reservation"}
                  </span>

                  <span className="time-badge">
                    {formatTimeRange(item)}
                  </span>

              {["approved", "overdue"].includes(item.status) && (
                  <button
                    type="button"
                    className="return-btn"
                    onClick={() => handleReturn(item)}
                    disabled={returningId === item.id}
                  >
                    {returningId === item.id
                      ? "Processing..."
                      : "Return"}
                  </button>
                )}

                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Requests;
