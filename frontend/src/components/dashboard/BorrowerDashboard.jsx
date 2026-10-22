
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import "./BorrowerDashboard.css";

function BorrowerDashboard() {
  const [stats, setStats] = useState({
    pendingRequests: 0,
    pendingReservations: 0,
    activeBorrowings: 0,
    activeReservations: 0,
  });

  const [upcomingReservations, setUpcomingReservations] = useState([]);
  const [requestProgress, setRequestProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(
          "http://localhost:5000/api/dashboard/borrower",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load dashboard");
        }

        setStats(data.stats);
        setUpcomingReservations(data.upcomingReservations || []);
        setRequestProgress(data.requestProgress || []);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Determine the progress of each request
  
  const getProgressSteps = (status) => {
    const approvedStatuses = [
      "approved",
      "for_delivery",
      "for_pickup",
      "ongoing",
    ];

    const isApproved = approvedStatuses.includes(status);
    const isReturned = status === "returned";
    const isCompleted = [
      "completed",
      "completed_with_issue",
    ].includes(status);

    const isRejected = [
      "rejected",
      "cancelled",
      "overdue",
    ].includes(status);

    return [
      {
        label: "Pending",
        done: true,
        current: status === "pending",
      },
      {
        label: "Approved",
        done: isApproved || isReturned || isCompleted,
        current: isApproved,
      },
      {
        label: "Returned",
        done: isReturned || isCompleted,
        current: isReturned,
      },
      {
        label: "Completed",
        done: isCompleted,
        current: false,
      },
    ];
  };


  const formatDate = (value) => {
    if (!value) return "";

    const dateString =
      typeof value === "string" && value.includes("T")
        ? value.split("T")[0]
        : value;

    const parts = String(dateString).slice(0, 10).split("-");

    if (parts.length !== 3) return dateString;

    const date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );

    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (time) => {
    return time ? String(time).slice(0, 5) : "";
  };

  const formatReservation = (item) => {
    const date = formatDate(item.date_needed);
    const timeStart = formatTime(item.time_start);
    const timeEnd = formatTime(item.time_end);

    const time = timeStart
      ? `${timeStart}${timeEnd ? ` - ${timeEnd}` : ""}`
      : "";

    return `${item.facility_name || "Facility"} - ${date}${
      time ? `, ${time}` : ""
    }`;
  };

  if (loading) {
    return (
      <div className="borrower-dashboard">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="borrower-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Borrower Dashboard</h1>
        <p>Welcome back! Track your requests and reservations.</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-card">
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-label">Pending Requests</div>
            <div className="stat-value">{stats.pendingRequests}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Pending Reservations</div>
            <div className="stat-value">{stats.pendingReservations}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Active Borrowings</div>
            <div className="stat-value">{stats.activeBorrowings}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Active Reservations</div>
            <div className="stat-value">{stats.activeReservations}</div>
          </div>
        </div>

        <div className="borrower-view-all">
          <Link to="/requests" className="borrower-view-all-link">
            View All
          </Link>
        </div>
      </div>

      {/* Request Progress */}
      <div className="section-card">
        <h2>Request Progress</h2>

        {requestProgress.length === 0 ? (
          <p>No requests have been submitted yet.</p>
        ) : (
          <div className="request-progress-list">
            {requestProgress.map((request) => {
              const steps = getProgressSteps(request.status);

              return (
                <div className="request-progress-item" key={request.id}>
                  <div className="request-progress-header">
                    <div>
                      <h3>{request.request_code}</h3>
                      <p>
                        {request.request_type === "facility"
                          ? "Facility Reservation"
                          : "Equipment Borrowing"}
                      </p>
                    </div>

                    <span
                      className={`status ${request.status}`}
                    >
                      {request.status === "completed_with_issue"
                        ? "Completed with Issue"
                        : request.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="progress-steps">
                    {steps.map((step, index) => (
                      <React.Fragment key={step.label}>
                        <div
                          className={`step ${
                            step.done ? "completed" : ""
                          } ${step.current ? "current" : ""}`}
                        >
                          {step.done && (
                            <FaCheckCircle className="step-icon" />
                          )}

                          <span>{step.label}</span>
                        </div>

                        {index < steps.length - 1 && (
                          <div
                            className={`step-line ${
                              steps[index + 1].done ? "completed" : ""
                            }`}
                          ></div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {["rejected", "cancelled"].includes(request.status) && (
                    <p className="request-final-status">
                      Request {request.status}.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming Approved Facility Reservations */}
      <div className="section-card">
        <h2>Upcoming Reservations</h2>

        <div className="reservations-list">
          {upcomingReservations.length === 0 ? (
            <div className="reservation-item empty">
              <span>No upcoming approved reservations</span>
            </div>
          ) : (
            upcomingReservations.map((item) => (
              <div key={item.id} className="reservation-item">
                <span className="reservation-title">
                  {formatReservation(item)}
                </span>

                <span className={`status ${item.status}`}>
                  {item.status.replaceAll("_", " ")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default BorrowerDashboard;
