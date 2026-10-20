
import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaFileExport,
} from "react-icons/fa";

import "./UserManagement.css";
import "./AuditLogs.css";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const logsPerPage = 10;

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Please log in again to view audit logs.");
        }

        const response = await fetch(
          "http://localhost:5000/api/audit-logs",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load audit logs."
          );
        }

        if (!Array.isArray(data)) {
          throw new Error("The server returned an invalid audit logs response.");
        }

        setLogs(data);
      } catch (err) {
        setError(err.message || "Failed to load audit logs.");
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      (log.user || "").toLowerCase().includes(searchText) ||
      (log.action || "").toLowerCase().includes(searchText) ||
      (log.targetModule || "").toLowerCase().includes(searchText) ||
      String(log.recordId || "").includes(searchText);

    const matchesRole =
      roleFilter === "All Roles" || log.role === roleFilter;

    const logDate = log.timestamp
      ? new Date(log.timestamp).toLocaleDateString("en-CA")
      : "";

    const matchesDate =
      !dateFilter || logDate === dateFilter;

    return matchesSearch && matchesRole && matchesDate;
  });

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const startIndex = (currentPage - 1) * logsPerPage;

  const displayedLogs = filteredLogs.slice(
    startIndex,
    startIndex + logsPerPage
  );

  const handleSearchChange = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleRoleChange = (value) => {
    setRoleFilter(value);
    setCurrentPage(1);
  };

  const handleDateChange = (value) => {
    setDateFilter(value);
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (filteredLogs.length === 0) {
      setError("There are no audit logs to export.");
      return;
    }

    setError("");

    const headers = [
      "Timestamp",
      "User",
      "Role",
      "Action",
      "Target Module",
      "Record ID",
      "IP Address",
    ];

    const rows = filteredLogs.map((log) => [
      log.timestamp
        ? new Date(log.timestamp).toLocaleString()
        : "",
      log.user || "",
      log.role || "",
      log.action || "",
      log.targetModule || "",
      log.recordId ?? "",
      log.ipAddress || "",
    ]);

    const escapeCSV = (value) => {
      let text = String(value ?? "");

      // Prevent spreadsheet formulas from being executed.
      if (/^[=+\-@\t\r]/.test(text)) {
        text = "'" + text;
      }

      return '"' + text.replace(/"/g, '""') + '"';
    };

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "audit_logs.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-page">
      <div className="audit-container">
        <div className="audit-header">
          <div>
            <h1>System Audit Logs</h1>
            <p>
              Chronological tracking of administrative actions
              and user events
            </p>
          </div>

          <button
            className="export-logs-btn"
            onClick={handleExport}
            disabled={loading || filteredLogs.length === 0}
          >
            <FaFileExport /> Export Logs
          </button>
        </div>

        <div className="audit-toolbar">
          <div className="search-box audit-search">
            <input
              type="text"
              placeholder="Search audit logs..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <FaSearch className="search-icon" />
          </div>

          <select
            className="audit-select"
            value={roleFilter}
            onChange={(e) => handleRoleChange(e.target.value)}
          >
            <option value="All Roles">All Roles</option>
            <option value="GSD Staff">GSD Staff</option>
            <option value="Administrator">Administrator</option>
            <option value="Borrower">Borrower</option>
            <option value="Unknown">Unknown</option>
          </select>

          <div className="date-picker-wrapper">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => handleDateChange(e.target.value)}
              className="audit-date-input"
              aria-label="Filter by date"
            />
          </div>

          {dateFilter && (
            <button
              className="audit-clear-btn"
              onClick={() => handleDateChange("")}
            >
              Clear Date
            </button>
          )}
        </div>

        {error && (
          <div className="audit-message audit-error">
            {error}
          </div>
        )}

        <div className="audit-table-card">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Action Performed</th>
                <th>Target Module</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="audit-empty">
                    Loading audit logs...
                  </td>
                </tr>
              ) : error && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="audit-empty">
                    Unable to load audit logs. Check your connection
                    and login status.
                  </td>
                </tr>
              ) : displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="audit-empty">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                displayedLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="timestamp-cell">
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleString()
                        : "N/A"}
                    </td>

                    <td className="user-cell">
                      {log.user || "Unknown User"}
                    </td>

                    <td>{log.role || "Unknown"}</td>

                    <td className="action-cell">
                      {log.action || "N/A"}
                    </td>

                    <td className="module-cell">
                      {log.targetModule || "System"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="audit-footer">
          <span>
            {loading
              ? "Loading records..."
              : filteredLogs.length === 0
              ? "Showing 0 records"
              : `Showing ${startIndex + 1}-${Math.min(
                  startIndex + logsPerPage,
                  filteredLogs.length
                )} of ${filteredLogs.length} records`}
          </span>

          <div className="pagination">
            <button
              className="page-btn nav-btn"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              ‹
            </button>

            {Array.from(
              { length: totalPages },
              (_, index) => index + 1
            ).map((page) => (
              <button
                key={page}
                className={
                  currentPage === page
                    ? "page-btn active"
                    : "page-btn"
                }
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              className="page-btn nav-btn"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
