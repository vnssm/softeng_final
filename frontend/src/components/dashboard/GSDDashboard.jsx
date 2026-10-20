import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./GSDDashboard.css";

function GSDDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    returns: 0,
    overdue: 0,
  });
  const [todayTasks, setTodayTasks] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch("http://localhost:5000/api/dashboard/personnel", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load dashboard");
        }

        setStats(data.stats);
        setTodayTasks(data.todayTasks || []);
        setRecentRequests(data.recentRequests || []);
      } catch (err) {
        console.error("Personnel Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const handleStatClick = (filter) => {
    if (filter === "approved") {
      navigate("/approved-transactions");
    } else {
      navigate(`/personnel-requests?filter=${filter}`);
    }
  };

  const formatTaskTitle = (task) => {
    const time = task.scheduled_time
      ? new Date(task.scheduled_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
    return `${time} - ${task.title || "Task"} - Request #${task.request_code || "N/A"}`;
  };

  if (loading) {
    return (
      <div className="personnel-dashboard">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="personnel-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>GSD Personnel Dashboard</h1>
        <p>Manage request, assignments, and equipment.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-card">
        <div className="stats-grid">
          <div
            className="stat-box"
            onClick={() => handleStatClick("pending")}
            style={{ cursor: "pointer" }}
          >
            <div className="stat-label">Pending Transactions</div>
            <div className="stat-value">{stats.pending}</div>
          </div>

          <div
            className="stat-box"
            onClick={() => handleStatClick("approved")}
            style={{ cursor: "pointer" }}
          >
            <div className="stat-label">Approved Transactions</div>
            <div className="stat-value">{stats.approved}</div>
          </div>

          <div
            className="stat-box"
            onClick={() => handleStatClick("returns")}
            style={{ cursor: "pointer" }}
          >
            <div className="stat-label">Returns</div>
            <div className="stat-value">{stats.returns}</div>
          </div>

          <div
            className="stat-box"
            onClick={() => handleStatClick("overdue")}
            style={{ cursor: "pointer" }}
          >
            <div className="stat-label">Overdue Transactions</div>
            <div className="stat-value">{stats.overdue}</div>
          </div>
        </div>
      </div>

      {/* Today's Task */}
      <div className="section-card">
        <h2>Today's Task</h2>
        <div className="list-container">
          {todayTasks.length === 0 ? (
            <div className="list-item empty">No tasks for today</div>
          ) : (
            todayTasks.map((task) => (
              <div key={task.id} className="list-item">
                <span className="list-title">{formatTaskTitle(task)}</span>
                <span className={`status ${task.status.toLowerCase()}`}>
                  {task.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Request */}
      <div className="section-card">
        <h2>Recent Request</h2>
        <div className="list-container">
          {recentRequests.length === 0 ? (
            <div className="list-item empty">No recent requests</div>
          ) : (
            recentRequests.map((req) => (
              <div key={req.id} className="list-item">
                <span className="list-title">
                  #{req.request_code} - {req.college_department || "N/A"}
                </span>
                <span className={`status ${req.status.toLowerCase()}`}>
                  {req.status.toLowerCase() === "completed_with_issue"
                    ? "Completed with Damage/Issue"
                    : req.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default GSDDashboard;