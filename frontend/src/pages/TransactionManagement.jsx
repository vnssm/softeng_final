import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaSearch,
  FaEllipsisH,
  FaCalendarAlt,
  FaFileExport,
} from "react-icons/fa";
import "./UserManagement.css";
import "./TransactionManagement.css";
import { API_URL } from "../config";

function TransactionManagement() {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [logisticsFilter, setLogisticsFilter] = useState("All Logistics");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedMenu = e.target.closest(".action-menu-wrapper");
      const clickedDropdown = e.target.closest(".tx-action-dropdown");

      if (!clickedMenu && !clickedDropdown) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
    );
  };

  const readResponse = async (response, defaultMessage) => {
    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(
        "Unexpected server response. Check the backend API route."
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || defaultMessage);
    }

    return data;
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const response = await fetch(
        `${API_URL}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await readResponse(
        response,
        "Failed to load transactions."
      );

      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch transactions error:", err);
      setError(err.message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  const getBorrowerName = (tx) => {
    return (
      `${tx.first_name || ""} ${tx.last_name || ""}`.trim() ||
      "Unknown User"
    );
  };

  const getTransactionType = (tx) => {
    return String(tx.request_type || "").toLowerCase() === "facility"
      ? "Facility"
      : "Equipment";
  };

  const normalizeStatus = (status) => {
    return String(status || "")
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_");
  };

  const getStatus = (status) => {
    const statusMap = {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      ongoing: "Active",
      returned: "Returned",
      overdue: "Overdue",
      completed: "Completed",
      completed_with_issue: "Completed with Issue",
      cancelled: "Cancelled",
      for_delivery: "For Delivery",
      for_pickup: "For Pickup",
    };

    const normalizedStatus = normalizeStatus(status);

    return statusMap[normalizedStatus] || status || "Unknown";
  };

  const getStatusClass = (status) => {
    const map = {
      Active: "status-active",
      Approved: "status-approved",
      "For Delivery": "status-for-release",
      "For Pickup": "status-for-release",
      Pending: "status-pending",
      Assigned: "status-assigned",
      Returned: "status-completed",
      Completed: "status-completed",
      "Completed with Issue": "status-completed",
      Overdue: "status-overdue",
      Rejected: "status-overdue",
      Cancelled: "status-overdue",
    };

    return map[status] || "";
  };

  const getLogistics = (value) => {
    const logistics = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    if (["delivery", "deliver", "for_delivery"].includes(logistics)) {
      return "Delivery";
    }

    if (["pickup", "pick_up", "for_pickup"].includes(logistics)) {
      return "Pickup";
    }

    return "Not Set";
  };

  const formatDate = (value) => {
    if (!value) return "Not specified";

    const dateText = String(value).substring(0, 10);
    const parts = dateText.split("-");

    if (parts.length !== 3) return dateText;

    return new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimelineDateTime = (value) => {
    if (!value) return "";

    const date = new Date(String(value).replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatTime = (value) => {
    if (!value) return "";

    const parts = String(value).split(":");
    let hour = Number(parts[0]);
    const minute = parts[1] || "00";
    const period = hour >= 12 ? "PM" : "AM";

    hour = hour % 12;

    if (hour === 0) hour = 12;

    return `${hour}:${minute} ${period}`;
  };

  const getTimeRange = (tx) => {
    if (!tx.time_start && !tx.time_end) {
      return "Time not specified";
    }

    return `${formatTime(tx.time_start)} - ${formatTime(tx.time_end)}`;
  };

  const getTimelineSteps = (tx) => {
    const status = normalizeStatus(tx.status);

    const approvedStatuses = [
      "approved",
      "for_delivery",
      "for_pickup",
      "ongoing",
      "returned",
      "overdue",
      "completed",
      "completed_with_issue",
    ];

    const activeStatuses = [
      "ongoing",
      "returned",
      "overdue",
      "completed",
      "completed_with_issue",
    ];

    const returnedStatuses = [
      "returned",
      "overdue",
      "completed",
      "completed_with_issue",
    ];

    return [
      {
        key: "requested",
        title: "Requested",
        done: true,
        date: formatTimelineDateTime(tx.created_at),
      },
      {
        key: "approved",
        title: "Approved",
        done: approvedStatuses.includes(status),
        date: formatTimelineDateTime(tx.approved_at),
      },
      {
        key: "active",
        title: "Active",
        done: activeStatuses.includes(status),
        date: formatTimelineDateTime(tx.active_at || tx.started_at),
      },
      {
        key: "returned",
        title: "Returned",
        done: returnedStatuses.includes(status),
        date: formatTimelineDateTime(tx.returned_at),
      },
      {
        key: "completed",
        title: "Completed",
        done: status === "completed",
        date: formatTimelineDateTime(tx.completed_at),
      },
      {
        key: "completed_with_issue",
        title: "Completed with Issue",
        done: status === "completed_with_issue",
        date: formatTimelineDateTime(tx.completed_at),
      },
    ];
  };

  const filtered = transactions.filter((tx) => {
    const borrower = getBorrowerName(tx).toLowerCase();
    const code = String(tx.request_code || "").toLowerCase();
    const type = getTransactionType(tx);
    const status = getStatus(tx.status);
    const rawStatus = normalizeStatus(tx.status);
    const logistics = getLogistics(tx.fulfillment_type);

    const items = [
      tx.equipment_names || "",
      tx.facility_name || "",
      tx.purpose || "",
      tx.location || "",
    ]
      .join(" ")
      .toLowerCase();

    const searchText = search.toLowerCase().trim();

    const matchesSearch =
      borrower.includes(searchText) ||
      code.includes(searchText) ||
      type.toLowerCase().includes(searchText) ||
      items.includes(searchText);

    const matchesType =
      typeFilter === "All Types" || type === typeFilter;

    const activeStatuses = [
      "approved",
      "for_delivery",
      "for_pickup",
      "ongoing",
      "overdue",
    ];

    const matchesStatus =
      statusFilter === "All Status" ||
      (statusFilter === "Active" &&
        activeStatuses.includes(rawStatus)) ||
      (statusFilter !== "Active" && status === statusFilter);

    // Specific logistics filters include approved and later statuses only.
    const logisticsEligibleStatuses = [
      "approved",
      "for_delivery",
      "for_pickup",
      "ongoing",
      "returned",
      "overdue",
      "completed",
      "completed_with_issue",
    ];

    const matchesLogistics =
      logisticsFilter === "All Logistics" ||
      (logistics === logisticsFilter &&
        logisticsEligibleStatuses.includes(rawStatus));

    const date = tx.date_needed
      ? String(tx.date_needed).substring(0, 10)
      : "";

    const matchesFromDate = !fromDate || (date && date >= fromDate);
    const matchesToDate = !toDate || (date && date <= toDate);

    return (
      matchesSearch &&
      matchesType &&
      matchesStatus &&
      matchesLogistics &&
      matchesFromDate &&
      matchesToDate
    );
  });

  const totalTransactions = transactions.length;

  const activeTransactions = transactions.filter((tx) =>
    [
      "approved",
      "for_delivery",
      "for_pickup",
      "ongoing",
    ].includes(normalizeStatus(tx.status))
  ).length;

  const totalReturns = transactions.filter((tx) =>
    ["returned", "overdue"].includes(normalizeStatus(tx.status))
  ).length;

  const completedTransactions = transactions.filter((tx) =>
    ["completed", "completed_with_issue"].includes(
      normalizeStatus(tx.status)
    )
  ).length;

  const toggleMenu = (id, event) => {
    if (openMenuId === id) {
      setOpenMenuId(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 180;
    const menuHeight = 100;
    const gap = 4;

    let left = rect.right - menuWidth;
    let top = rect.bottom + gap;

    if (left < 8) left = 8;

    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    if (top + menuHeight > window.innerHeight - 8) {
      top = rect.top - menuHeight - gap;
    }

    setMenuPosition({ top, left });
    setOpenMenuId(id);
  };

  const openDetails = (tx) => {
    setSelectedTx(tx);
    setOpenMenuId(null);
    setActionError("");
  };

  const closeDetails = () => {
    setSelectedTx(null);
    setActionError("");
  };

  const handleRemove = async (id) => {
    const confirmed = window.confirm(
      "Remove this transaction from the list?\nThe transaction record will remain in the database."
    );

    if (!confirmed) return;

    try {
      setActionError("");

      const token = getToken();

      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const response = await fetch(
        `${API_URL}/transactions/${id}/remove`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await readResponse(response, "Failed to remove transaction.");

      setTransactions((prev) =>
        prev.filter((tx) => String(tx.id) !== String(id))
      );

      setOpenMenuId(null);

      if (selectedTx && String(selectedTx.id) === String(id)) {
        setSelectedTx(null);
      }
    } catch (err) {
      console.error("Remove transaction error:", err);
      setActionError(err.message || "Failed to remove transaction.");
      setOpenMenuId(null);
    }
  };

  const exportCSV = async () => {
    if (filtered.length === 0) {
      window.alert("There are no transactions to export.");
      return;
    }

    const headers = [
      "Request Code",
      "Type",
      "Borrower",
      "Department",
      "Date Needed",
      "Start Time",
      "End Time",
      "Items",
      "Logistics",
      "Status",
      "Purpose",
      "Location",
      "Handled By",
      "Requested At",
      "Approved At",
      "Active At",
      "Returned At",
      "Completed At",
    ];

    const rows = filtered.map((tx) => [
      tx.request_code || `TX-${tx.id}`,
      getTransactionType(tx),
      getBorrowerName(tx),
      tx.college_department || "",
      formatDate(tx.date_needed),
      tx.time_start || "",
      tx.time_end || "",
      [tx.equipment_names, tx.facility_name].filter(Boolean).join("; "),
      getLogistics(tx.fulfillment_type),
      getStatus(tx.status),
      tx.purpose || "",
      tx.location || "",
      tx.handled_by || tx.personnel_name || "",
      tx.created_at || "",
      tx.approved_at || "",
      tx.active_at || tx.started_at || "",
      tx.returned_at || "",
      tx.completed_at || "",
    ]);

    const escapeCSV = (value) => {
      return `"${String(value ?? "").replace(/"/g, '""')}"`;
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
    link.download = "transactions.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    try {
      const token = getToken();

      if (!token) return;

      const response = await fetch(
        `${API_URL}/activities/record-export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            actionType: "csv_exported",
            description: "Exported transactions to CSV",
          }),
        }
      );

      if (!response.ok) {
        console.error("Failed to record CSV export activity.");
      }
    } catch (err) {
      console.error("CSV export activity error:", err);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-header tx-header">
          <div>
            <h1>Transaction Management</h1>
            <p>
              View and manage borrowing and reservation transactions across
              campus.
            </p>
          </div>

          <div className="header-actions">
            <button
              className="outline-btn"
              onClick={() => window.location.assign("/audit-logs")}
            >
              View Audit Logs
            </button>

            <button className="outline-btn" onClick={exportCSV}>
              <FaFileExport /> Export CSV
            </button>
          </div>
        </div>

        <div className="date-range">
          <div className="date-field">
            <label>From:</label>
            <div className="date-input">
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <FaCalendarAlt className="date-icon" />
            </div>
          </div>

          <div className="date-field">
            <label>To:</label>
            <div className="date-input">
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
              />
              <FaCalendarAlt className="date-icon" />
            </div>
          </div>
        </div>

        <div className="tx-stats">
          <div className="tx-stat-card">
            <span className="stat-label">Total Transactions</span>
            <span className="stat-value">{totalTransactions}</span>
          </div>

          <div className="tx-stat-card">
            <span className="stat-label">Active Transactions</span>
            <span className="stat-value">{activeTransactions}</span>
          </div>

          <div className="tx-stat-card">
            <span className="stat-label">Returns / Overdue</span>
            <span className="stat-value">{totalReturns}</span>
          </div>

          <div className="tx-stat-card">
            <span className="stat-label">Completed</span>
            <span className="stat-value">{completedTransactions}</span>
          </div>
        </div>

        <div className="admin-toolbar">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="role-select"
          >
            <option>All Types</option>
            <option>Equipment</option>
            <option>Facility</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="role-select"
          >
            <option>All Status</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Active</option>
            <option>For Delivery</option>
            <option>For Pickup</option>
            <option>Returned</option>
            <option>Completed</option>
            <option>Completed with Issue</option>
            <option>Overdue</option>
            <option>Rejected</option>
            <option>Cancelled</option>
          </select>

          <select
            value={logisticsFilter}
            onChange={(e) => setLogisticsFilter(e.target.value)}
            className="role-select"
          >
            <option>All Logistics</option>
            <option>Pickup</option>
            <option>Delivery</option>
          </select>
        </div>

        {actionError && (
          <p className="error-message" role="alert">
            {actionError}
          </p>
        )}

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Borrower / User</th>
                <th>Date</th>
                <th>Logistics</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">Loading transactions...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="7">{error}</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7">No transactions found.</td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const borrower = getBorrowerName(tx);
                  const status = getStatus(tx.status);

                  return (
                    <tr key={tx.id}>
                      <td>{tx.request_code || `TX-${tx.id}`}</td>
                      <td>{getTransactionType(tx)}</td>

                      <td>
                        <div className="borrower-cell">
                          <div className="avatar-sm">
                            {borrower.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <div className="borrower-name">{borrower}</div>
                            <div className="borrower-org">
                              {tx.college_department || "No department"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div>{formatDate(tx.date_needed)}</div>
                        <div className="time-sub">{getTimeRange(tx)}</div>
                      </td>

                      <td>
                        <span className="status-pill logistics-pill">
                          {getLogistics(tx.fulfillment_type)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-pill ${getStatusClass(status)}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="actions">
                        <div className="action-menu-wrapper">
                          <button
                            type="button"
                            className="icon-btn tx-action-button"
                            aria-label="Transaction actions"
                            aria-expanded={openMenuId === tx.id}
                            onClick={(e) => toggleMenu(tx.id, e)}
                          >
                            <FaEllipsisH />
                          </button>

                          {openMenuId === tx.id &&
                            createPortal(
                              <div
                                className="tx-action-dropdown"
                                style={{
                                  position: "fixed",
                                  top: `${menuPosition.top}px`,
                                  left: `${menuPosition.left}px`,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetails(tx);
                                  }}
                                >
                                  View Details
                                </button>

                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() => handleRemove(tx.id)}
                                >
                                  Remove
                                </button>
                              </div>,
                              document.body
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span>
            Showing {filtered.length} of {transactions.length} transactions
          </span>
        </div>
      </div>

      {selectedTx && (
        <div className="tx-details-overlay" onClick={closeDetails}>
          <div
            className="tx-details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Transaction Details</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeDetails}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="tx-tags">
                <span className="tag tag-id">
                  {selectedTx.request_code || `TX-${selectedTx.id}`}
                </span>

                <span
                  className={`status-pill ${getStatusClass(
                    getStatus(selectedTx.status)
                  )}`}
                >
                  {getStatus(selectedTx.status)}
                </span>
              </div>

              <div className="tx-info-card">
                <div className="info-row">
                  <div className="info-avatar">
                    {getBorrowerName(selectedTx).charAt(0).toUpperCase()}
                  </div>

                  <div className="info-content horizontal">
                    <span className="info-label">Borrower:</span>
                    <div className="info-right">
                      <div className="info-value">
                        {getBorrowerName(selectedTx)}
                      </div>
                      <div className="info-sub">
                        {selectedTx.college_department || "No department"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-icon-circle">📅</div>
                  <div className="info-content horizontal">
                    <span className="info-label">Date & Time</span>
                    <div className="info-right">
                      <div className="info-value">
                        {formatDate(selectedTx.date_needed)}
                      </div>
                      <div className="info-sub">
                        {getTimeRange(selectedTx)}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedTx.date_end && (
                  <div className="info-row">
                    <div className="info-icon-circle">📆</div>
                    <div className="info-content horizontal">
                      <span className="info-label">End Date</span>
                      <div className="info-right">
                        <div className="info-value">
                          {formatDate(selectedTx.date_end)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="info-row">
                  <div className="info-icon-circle">👤</div>
                  <div className="info-content horizontal">
                    <span className="info-label">Requested By:</span>
                    <div className="info-right">
                      <div className="info-value">
                        {getBorrowerName(selectedTx)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-icon-circle">📦</div>
                  <div className="info-content horizontal">
                    <span className="info-label">Type / Item:</span>
                    <div className="info-right">
                      <div className="info-value">
                        {getTransactionType(selectedTx)}
                      </div>
                      <div className="info-sub">
                        {selectedTx.equipment_names ||
                          selectedTx.facility_name ||
                          "No item information"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-icon-circle">🚚</div>
                  <div className="info-content horizontal">
                    <span className="info-label">Logistics:</span>
                    <div className="info-right">
                      <div className="info-value">
                        {getLogistics(selectedTx.fulfillment_type)}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedTx.purpose && (
                  <div className="info-row">
                    <div className="info-icon-circle">📝</div>
                    <div className="info-content horizontal">
                      <span className="info-label">Purpose:</span>
                      <div className="info-right">
                        <div className="info-value">
                          {selectedTx.purpose}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTx.location && (
                  <div className="info-row">
                    <div className="info-icon-circle">📍</div>
                    <div className="info-content horizontal">
                      <span className="info-label">Location:</span>
                      <div className="info-right">
                        <div className="info-value">
                          {selectedTx.location}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(selectedTx.handled_by || selectedTx.personnel_name) && (
                  <div className="info-row">
                    <div className="info-icon-circle">🛠️</div>
                    <div className="info-content horizontal">
                      <span className="info-label">Handled By:</span>
                      <div className="info-right">
                        <div className="info-value">
                          {selectedTx.handled_by ||
                            selectedTx.personnel_name}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTx.rejection_reason && (
                  <div className="info-row">
                    <div className="info-icon-circle">ℹ️</div>
                    <div className="info-content horizontal">
                      <span className="info-label">Reason:</span>
                      <div className="info-right">
                        <div className="info-value">
                          {selectedTx.rejection_reason}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTx.remarks && (
                  <div className="info-row">
                    <div className="info-icon-circle">💬</div>
                    <div className="info-content horizontal">
                      <span className="info-label">Remarks:</span>
                      <div className="info-right">
                        <div className="info-value">
                          {selectedTx.remarks}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="section">
                <h3 className="timeline-heading">Transaction Timeline</h3>
                <div className="timeline">
                  {getTimelineSteps(selectedTx).map((step) => (
                    <div
                      key={step.key}
                      className={`timeline-item ${
                        step.done ? "completed" : "pending"
                      }`}
                    >
                      <div className="timeline-marker">
                        {step.done ? (
                          <div className="timeline-check">✓</div>
                        ) : (
                          <div className="timeline-dot-empty"></div>
                        )}
                      </div>

                      <div className="timeline-content">
                        <div className="timeline-title">{step.title}</div>
                        {step.done && step.date && (
                          <div className="timeline-date">{step.date}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionManagement;