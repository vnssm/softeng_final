import React, { useState, useMemo, useEffect } from "react";
import { Navigate, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { FaLayerGroup, FaMapMarkerAlt } from "react-icons/fa";
import "./GSDRequests.css";
import { API_URL } from "../config";

function formatDate(date) {
  if (!date) return "—";

  const datePart = String(date).split("T")[0];
  const parts = datePart.split("-");

  if (parts.length !== 3) return date;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const monthNames = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
  ];

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return date;
  }

  return monthNames[month - 1] + " " + day + ", " + year;
}

function formatTime(time) {
  if (!time) return "—";

  const parts = String(time).split(":");
  let hours = Number(parts[0]);
  const minutes = parts[1] || "00";

  if (isNaN(hours)) return time;

  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return hours + ":" + minutes + " " + period;
}

function isPastEndDateTime(item) {
  if (!item.endDate || !item.endTime) {
    return false;
  }

  const endDate = String(item.endDate).split("T")[0];
  const endTime = String(item.endTime);

  const endDateTime = new Date(endDate + "T" + endTime);

  return !isNaN(endDateTime.getTime()) &&
    endDateTime < new Date();
}

function isCompletedReturn(status) {
  return status === "Completed" || status === "Completed With Issue";
}

function GSDRequests() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get("filter") || "pending";

  const role = localStorage.getItem("role") || "borrower";
  if (role !== "personnel" && role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const [activeTab, setActiveTab] = useState("Equipment");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Returns modal state
  const [selectedItem, setSelectedItem] = useState(null);
  const [returnState, setReturnState] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");

  // Approval modal state
  const [approvalItem, setApprovalItem] = useState(null);
  const [decision, setDecision] = useState(""); // "approve" | "reject"
  const [rejectReason, setRejectReason] = useState("");
  const [assignedPersonnel, setAssignedPersonnel] = useState("");
  const [waiverFile, setWaiverFile] = useState(null);
  const [approvalFieldErrors, setApprovalFieldErrors] = useState({});

  const [allRequests, setAllRequests] = useState([]);

  useEffect(() => {
    const loadRequests = async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/requests/requests`,
          {
            headers: {
              Authorization: "Bearer " + token,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load requests.");
        }

        const formattedRequests = (data.requests || []).map((item) => {
          let status = item.status || "pending";

          status = status
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase());

          return {
            ...item,
            id: item.id,
            type: item.type,
            name: item.name || "Unnamed Request",
            requestedBy: item.requestedBy || "Unknown Borrower",
            purpose: item.purpose || "No purpose provided",
            location: item.location || "Not specified",
            status: status,
            deliveryType: item.fulfillment_type
              ? item.fulfillment_type.charAt(0).toUpperCase() +
                item.fulfillment_type.slice(1)
              : "",
            startDate: item.date_needed || item.startDate || item.start_date || "",
            endDate: item.date_end || item.end_date || item.endDate || "",
            startTime: item.time_start || item.startTime || item.start_time || "",
            endTime: item.time_end || item.endTime || item.end_time || "",
            time:
              formatTime(item.time_start || item.startTime || item.start_time) +
              " - " +
              formatTime(item.time_end || item.endTime || item.end_time),
            borrower: item.requestedBy || "Unknown Borrower",
          };
        });

        setAllRequests(formattedRequests);
      } catch (error) {
        console.error("Load personnel requests error:", error);
        setError(error.message);
      } finally {
        if (showLoading) setLoading(false);
      }
    };

    loadRequests(true);

    const refreshVisibleRequests = () => {
      if (document.visibilityState === "visible") {
        loadRequests();
      }
    };

    window.addEventListener("focus", refreshVisibleRequests);
    const refreshInterval = window.setInterval(refreshVisibleRequests, 30000);

    return () => {
      window.removeEventListener("focus", refreshVisibleRequests);
      window.clearInterval(refreshInterval);
    };
  }, []);

  // ADD THE NEW useEffect HERE
  useEffect(() => {
    const requestId = location.state?.openRequestId;

    if (!requestId || allRequests.length === 0) {
      return;
    }

    const request = allRequests.find(
      (item) => String(item.id) === String(requestId)
    );

    if (request && filter === "pending") {
      setApprovalItem(request);
      setDecision("");
      setRejectReason("");
      setAssignedPersonnel("");
      setWaiverFile(null);
      setApprovalFieldErrors({});

      navigate(location.pathname + location.search, {
        replace: true,
        state: null,
      });
    }
  }, [
    allRequests,
    location.state,
    location.pathname,
    location.search,
    filter,
    navigate,
  ]);

  const getAllowedStatuses = () => {
    switch (filter) {
      case "pending":
        return ["Pending", "Under Review"];
      case "approved":
        return ["Approved", "For Delivery", "For Pickup", "Ongoing"];
      case "returns":
        return ["Returned", "Completed", "Completed With Issue"];
      case "overdue":
        return ["Overdue"];
      default:
        return [
          "Pending",
          "Under Review",
          "Rejected",
          "Approved",
          "For Delivery",
          "For Pickup",
          "Ongoing",
          "Returned",
          "Completed",
        ];
    }
  };

  const showStatusDropdown = filter === "returns";

  const pageTitle = {
    pending: "Pending Transactions",
    approved: "Approved Transactions",
    returns: "Returns",
    overdue: "Overdue Transactions",
  }[filter] || "Requests";

  const filteredList = useMemo(() => {
    const allowedStatuses = getAllowedStatuses();

    return allRequests.filter((item) => {
      if (item.type !== activeTab) return false;
      
      if (!allowedStatuses.includes(item.status)) return false;

      if (filter === "returns" && statusFilter !== "All") {
        if (item.status !== statusFilter) return false;
      }

      const searchLower = search.toLowerCase();
      if (
        search &&
        !item.name.toLowerCase().includes(searchLower) &&
        !item.requestedBy.toLowerCase().includes(searchLower)
      ) {
        return false;
      }

      return true;
    });
  }, [activeTab, statusFilter, search, filter, allRequests]);

  const getStatusLabel = (status) => {
    if (filter === "overdue") return "Overdue";

    return status;
  };

  const getStatusClass = (status) => {
    if (filter === "overdue") return "overdue";

    return status.toLowerCase().replace(" ", "-");
  };

  // ===== Returns helpers =====
  const openReturnModal = (item) => {
    if (item.status !== "Returned") return;
    setSelectedItem(item);
    setReturnState("");
    setInspectionNotes("");
  };

  const closeReturnModal = () => {
    setSelectedItem(null);
    setReturnState("");
    setInspectionNotes("");
  };

  const isReturnComplete = (status) =>
    ["Completed", "Completed With Issue"].includes(status);

  
  const handleSendReturn = async () => {
    if (!returnState) {
      setError("Please select the condition of the returned item.");
      return;
    }

    if (!inspectionNotes.trim()) {
      setError("Please enter the inspection results.");
      return;
    }

    try {
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/requests/requests/${selectedItem.id}/inspect-return`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            return_condition: returnState,
            inspection_notes: inspectionNotes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to save return inspection.");
        return;
      }

      setAllRequests((previousRequests) =>
        previousRequests.map((item) =>
          item.id === selectedItem.id
            ? {
                ...item,
                status:
                  data.status === "completed_with_issue"
                    ? "Completed With Issue"
                    : "Completed",
                return_condition: data.return_condition,
                inspection_notes: data.inspection_notes,
              }
            : item
        )
      );

      setSelectedItem(null);
      setReturnState("");
      setInspectionNotes("");
    } catch (error) {
      console.error("Return inspection error:", error);
      setError("Cannot connect to the server. Please try again.");
    }
  };


  const stateOptions =
    selectedItem?.type === "Facility"
      ? ["Normal", "In minor disarray", "Neglected"]
      : ["Normal", "With minor defect", "With major defect"];

  // ===== Approval helpers =====
  const openApprovalModal = (item) => {
    setApprovalItem(item);
    setDecision("");
    setRejectReason("");
    setAssignedPersonnel("");
    setWaiverFile(null);
    setApprovalFieldErrors({});
  };

  const closeApprovalModal = () => {
    setApprovalItem(null);
    setDecision("");
    setRejectReason("");
    setAssignedPersonnel("");
    setWaiverFile(null);
    setApprovalFieldErrors({});
  };

  
  const handleApproveSave = async () => {
    const fieldErrors = {};

    if (!waiverFile) {
      fieldErrors.waiverFile =
        "Please upload the release document before approving.";
    }

    if (!assignedPersonnel) {
      fieldErrors.assignedPersonnel =
        "Please choose an employee to assign before approving.";
    }

    setApprovalFieldErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    try {
      setError("");
      setApprovalFieldErrors({});

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/requests/requests/${approvalItem.id}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignedPersonnel: assignedPersonnel,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to approve request.");
      }

      window.dispatchEvent(new Event("request-status-updated"));

      setAllRequests((prev) =>
        prev.map((req) =>
          req.id === approvalItem.id
            ? { ...req, status: "Approved" }
            : req
        )
      );

      closeApprovalModal();
    } catch (error) {
      console.error("Approve request error:", error);
      setError(error.message);
    }
  };


  
const handleRejectSend = async () => {
  if (!rejectReason.trim()) {
    setError("Please provide a reason for rejection.");
    return;
  }

  try {
    setError("");

    const token = localStorage.getItem("token");

    const response = await fetch(
      `${API_URL}/requests/requests/${approvalItem.id}/reject`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rejection_reason: rejectReason.trim(),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to reject request.");
    }

    setAllRequests((prev) =>
      prev.map((req) =>
        req.id === approvalItem.id
          ? {
              ...req,
              status: "Rejected",
              rejection_reason: rejectReason.trim(),
            }
          : req
      )
    );

    closeApprovalModal();
  } catch (error) {
    console.error("Reject request error:", error);
    setError(error.message);
  }
};


  return (
    <div className="personnel-requests-page">
      <div className="requests-card">
        {/* Header */}
        <div className="requests-header">
          <div>
            <h1>{pageTitle}</h1>
            <p>Track and manage transactions.</p>
          </div>
          <button className="close-btn" onClick={() => navigate("/dashboard")}>
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="requests-filters">
          <div className="tabs">
            <button
              className={`tab ${activeTab === "Equipment" ? "active" : ""}`}
              onClick={() => setActiveTab("Equipment")}
            >
              Equipment
            </button>
            <button
              className={`tab ${activeTab === "Facility" ? "active" : ""}`}
              onClick={() => setActiveTab("Facility")}
            >
              Facilities
            </button>
          </div>

          <div className="filter-right">
            {showStatusDropdown && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-select"
              >
                <option value="All">Status: All</option>
                <option value="Returned">Returned</option>
                <option value="Completed">Completed</option>
                <option value="Completed With Issue">
                  Completed with Damage/Issue Report
                </option>
              </select>
            )}

            <div className="search-box">
              <input
                type="text"
                placeholder="Search request"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* List */}
        <div className="requests-list">
          {filteredList.map((item) => (
            <div key={item.id} className="request-card">
              <div className="card-top">
                <h3 className="card-title">{item.name}</h3>

                {/* Pending → View (approval) */}
                {filter === "pending" && (
                  <button className="view-btn" onClick={() => openApprovalModal(item)}>
                    View
                  </button>
                )}

                {/* Returns → View (inspection) */}
                {filter === "returns" && (
                  <button
                    className={`view-btn ${isReturnComplete(item.status) ? "disabled" : ""}`}
                    onClick={() => openReturnModal(item)}
                    disabled={isReturnComplete(item.status)}
                  >
                    View
                  </button>
                )}

                {/* Other filters → status badge */}
                {filter !== "pending" && filter !== "returns" && (
                  <div className={`status-badge ${getStatusClass(item.status)}`}>
                    <span className="dot"></span>
                    {getStatusLabel(item.status)}
                  </div>
                )}
              </div>

              <div className="card-details">
                <p>
                  <FaLayerGroup className="detail-icon" />
                  Purpose: {item.purpose}
                </p>
                <p>
                  <FaMapMarkerAlt className="detail-icon" />
                  Location: {item.location}
                </p>
              </div>

              <div className="card-divider"></div>

              <div className="card-bottom">
                <span className="requested-by">By {item.requestedBy}</span>

                {filter === "returns" ? (
                  <span className={`status-badge ${getStatusClass(item.status)}`}>
                    <span className="dot"></span>
                    {item.status}
                  </span>
                ) : (
                  <span
                    className={`time-badge ${filter === "overdue" ? "overdue-time" : ""}`}
                    style={
                      filter === "overdue"
                        ? { color: "#e53935", fontWeight: 600 }
                        : {}
                    }
                  >
                    {item.time}
                  </span>
                )}
              </div>
            </div>
          ))}

          {loading ? (
            <div className="empty-state">Loading requests...</div>
          ) : error ? (
            <div className="empty-state">{error}</div>
          ) : filteredList.length === 0 ? (
            <div className="empty-state">No transactions found.</div>
          ) : null}
        </div>
      </div>

      {/* ========== APPROVAL MODAL (Pending) ========== */}
      {approvalItem && (
        <div className="modal-overlay" onClick={closeApprovalModal}>
          <div className="return-modal approval-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{approvalItem.name}</h2>
              <div className="modal-status available">
                <span className="dot available-dot"></span>
                Available
              </div>
              <button className="modal-close" onClick={closeApprovalModal}>
                ×
              </button>
            </div>

            <div className="modal-body">

              {error && (
                <p className="error-message">
                  {error}
                </p>
              )}

              {/* Borrower info */}
              <div className="info-box full">
                <label>Borrower Information</label>
                <p>Name of Borrower: {approvalItem.borrower || approvalItem.requestedBy}</p>
                <p>Location: {approvalItem.location}</p>
                {approvalItem.type === "Equipment" && (
                  <div className="field">
                    <label>Fulfillment Type</label>
                    <input
                      type="text"
                      value={approvalItem.deliveryType || "Not specified"}
                      readOnly
                    />
                  </div>
                )}
              </div>

              {/* Dates & Times */}
              <div className="date-grid">
              <div className="field">
                <label>Start Date</label>
                <input
                  type="text"
                  value={formatDate(approvalItem.startDate)}
                  readOnly
                />
              </div>

              <div className="field">
                <label>End Date</label>
                <input
                  type="text"
                  value={formatDate(approvalItem.endDate)}
                  readOnly
                />
              </div>

              <div className="field">
                <label>Start Time</label>
                <input
                  type="text"
                  value={formatTime(approvalItem.startTime)}
                  readOnly
                />
              </div>

              <div className="field">
                <label>End Time</label>
                <input
                  type="text"
                  value={formatTime(approvalItem.endTime)}
                  readOnly
                />
              </div>
            </div>

              {/* Purpose */}
              <div className="field">
                <label>Purpose</label>
                <textarea value={approvalItem.purpose} readOnly rows={2} />
              </div>
              

              {/* Approve / Reject toggle */}
              <div className="decision-btns">
                <button
                  className={`decision-btn approve ${decision === "approve" ? "active" : ""}`}
                  onClick={() => {
                    setDecision("approve");
                    setError("");
                    setApprovalFieldErrors({});
                  }}
                >
                  Approve
                </button>
                <button
                  className={`decision-btn reject ${decision === "reject" ? "active" : ""}`}
                  onClick={() => {
                    setDecision("reject");
                    setError("");
                    setApprovalFieldErrors({});
                  }}
                >
                  Reject
                </button>
              </div>

              {/* ===== APPROVE PATH ===== */}
              {decision === "approve" && (
                <>
                  <div className="field">
                    {approvalFieldErrors.waiverFile && (
                      <p className="field-error" role="alert">
                        {approvalFieldErrors.waiverFile}
                      </p>
                    )}
                    <label>Upload copy of release document</label>
                    <div className="upload-box">
                      <input
                        type="file"
                        id="waiver"
                        accept=".pdf,application/pdf"
                        required
                        onChange={(e) => {const file = e.target.files[0]; 
                          if (!file){
                            setWaiverFile(null);
                            setApprovalFieldErrors((previousErrors) => ({
                              ...previousErrors,
                              waiverFile: "",
                            }));
                            return;
                          }

                          if (
                            file.type !== "application/pdf" ||
                            !file.name.toLowerCase().endsWith(".pdf")
                          ) {
                            setApprovalFieldErrors((previousErrors) => ({
                              ...previousErrors,
                              waiverFile: "Please select a PDF document.",
                            }));
                            setWaiverFile(null);
                            e.target.value = "";
                            return;
                          }

                          setApprovalFieldErrors((previousErrors) => ({
                            ...previousErrors,
                            waiverFile: "",
                          }));
                          setWaiverFile(file);
                        }}
                      />
                      <label htmlFor="waiver" className="upload-label">
                        {waiverFile ? waiverFile.name : "Select document"}
                      </label>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field">
                      {approvalFieldErrors.assignedPersonnel && (
                        <p className="field-error" role="alert">
                          {approvalFieldErrors.assignedPersonnel}
                        </p>
                      )}
                      <label>
                        Assign Personnel for {approvalItem.deliveryType || "Fulfillment"}
                      </label>
                      <select
                        value={assignedPersonnel}
                        onChange={(e) => {
                          setAssignedPersonnel(e.target.value);
                          setApprovalFieldErrors((previousErrors) => ({
                            ...previousErrors,
                            assignedPersonnel: "",
                          }));
                        }}
                        required
                      >
                        <option value="">Select personnel</option>
                        <option value="Maria Santos">
                          Maria Santos
                        </option>
                      </select>
                    </div>
                  </div>

                  <button className="btn-send full" onClick={handleApproveSave}>
                    Save
                  </button>
                </>
              )}

              {/* ===== REJECT PATH ===== */}
              {decision === "reject" && (
                <>
                  <div className="field">
                    <label>Reason</label>
                    <textarea
                      placeholder="Type reason here..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <button className="btn-send full" onClick={handleRejectSend}>
                    Send
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== RETURNS MODAL ========== */}
      {selectedItem && (
        <div className="modal-overlay" onClick={closeReturnModal}>
          <div className="return-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.name}</h2>
              <div className="modal-status">
                <span className="dot returned-dot"></span>
                Returned
              </div>
              <button className="modal-close" onClick={closeReturnModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="info-row">
                <div className="info-box">
                  <label>Borrower Information</label>
                  <p>Name of Borrower: {selectedItem.borrower || selectedItem.requestedBy}</p>
                  <p>Location: {selectedItem.location}</p>
                </div>
                <div className="info-box">
                  <label>Date & Time</label>
                  <p>
                    Started: {formatDate(selectedItem.startDate)}
                  </p>
                  <p>
                    Start Time: {formatTime(selectedItem.startTime)}
                  </p>
                  <p>
                    Ended: {formatDate(selectedItem.endDate)}
                  </p>
                  <p>
                    End Time: {formatTime(selectedItem.endTime)}
                  </p>
                </div>
              </div>

              <div className="state-section">
                <label>
                  State of {selectedItem.type === "Facility" ? "facility" : "equipment"} on return
                </label>
                <div className="state-options">
                  {stateOptions.map((opt) => (
                    <button
                      key={opt}
                      className={`state-btn ${returnState === opt ? "active" : ""}`}
                      onClick={() => setReturnState(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="inspection-section">
                <label>Inspection results *</label>
                <textarea
                  placeholder="Write inspection notes..."
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-send" onClick={handleSendReturn}>
                Send
              </button>
              <button className="btn-cancel" onClick={closeReturnModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GSDRequests;