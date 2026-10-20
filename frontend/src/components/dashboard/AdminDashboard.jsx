import React, { useEffect, useState } from "react";
import "./AdminDashboard.css";

function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) {
          setError("Please log in again to view the dashboard.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          "http://localhost:5000/api/dashboard/admin",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load dashboard."
          );
        }

        setDashboardData(data);
      } catch (error) {
        console.error("Admin dashboard error:", error);
        setError(
          error.message || "Unable to connect to the server."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const stats = [
    {
      label: "Total Users",
      value: dashboardData?.stats?.totalUsers ?? 0,
    },
    {
      label: "Total Equipment",
      value: dashboardData?.stats?.totalEquipment ?? 0,
    },
    {
      label: "Total Transactions",
      value: dashboardData?.stats?.totalTransactions ?? 0,
    },
    {
      label: "Total Facilities",
      value: dashboardData?.stats?.totalFacilities ?? 0,
    },
  ];

  const overview = [
    {
      id: 1,
      title: "Active Borrowings",
      value:
        dashboardData?.systemOverview?.activeBorrowings ?? 0,
    },
    {
      id: 2,
      title: "Upcoming Reservations",
      value:
        dashboardData?.systemOverview?.upcomingReservations ?? 0,
    },
    {
      id: 3,
      title: "Overdue Transactions",
      value:
        dashboardData?.systemOverview?.overdueTransactions ?? 0,
    },
  ];

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>Administrator Dashboard</h1>
          <p>Monitor the entire E-Bulod system.</p>
        </div>

        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Administrator Dashboard</h1>
        <p>Monitor the entire E-Bulod system.</p>
      </div>

      {error && (
        <div className="dashboard-error">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      )}

      {!error && (
        <>
          <div className="stats-card">
            <div className="stats-grid">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="stat-box"
                >
                  <div className="stat-label">
                    {stat.label}
                  </div>

                  <div className="stat-value">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card">
            <h2>System Activity</h2>

            <div className="list-container">
              {dashboardData?.systemActivity?.length > 0 ? (
                dashboardData.systemActivity.map((item) => (
                  <div
                    key={item.id}
                    className="list-item"
                  >
                    <span className="list-title">
                      {item.title}
                    </span>

                    <span className="activity-time">
                      {item.time}
                    </span>
                  </div>
                ))
              ) : (
                <div className="list-item">
                  <span className="list-title">
                    No recent activity available.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="section-card">
            <h2>System Overview</h2>

            <div className="list-container">
              {overview.map((item) => (
                <div
                  key={item.id}
                  className="list-item"
                >
                  <span className="list-title">
                    {item.title}
                  </span>

                  <span className="overview-value">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;