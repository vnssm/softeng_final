
import React, { useState } from "react";
import "./FacilityModals.css";

function FacilityReserveModal({ facility, onClose }) {
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    purpose: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setMessage("");
    setMessageType("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || submitted) {
      return;
    }

    if (
      !formData.startDate ||
      !formData.endDate ||
      !formData.startTime ||
      !formData.endTime ||
      !formData.purpose.trim()
    ) {
      setMessage("Please complete all reservation fields.");
      setMessageType("error");
      return;
    }

    if (
      formData.endDate < formData.startDate ||
      (formData.startDate === formData.endDate &&
        formData.endTime <= formData.startTime)
    ) {
      setMessage(
        "Please check that your end date and time are later than your start date and time."
      );
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in again before submitting.");
      }

      const response = await fetch(
        "http://localhost:5000/api/reservations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            facilityId: facility.id,
            startDate: formData.startDate,
            endDate: formData.endDate,
            startTime: formData.startTime,
            endTime: formData.endTime,
            purpose: formData.purpose,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to submit facility reservation."
        );
      }

      setMessage(
        data.message || "Facility reservation submitted successfully!"
      );
      setMessageType("success");
      setSubmitted(true);
    } catch (error) {
      console.error("Facility reservation error:", error);
      setMessage(
        error.message || "Unable to connect to the server."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={() => {
        if (!loading) {
          onClose();
        }
      }}
    >
      <div
        className="modal-content facility-reserve-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{facility?.name}</h2>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                disabled={submitted}
                required
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                min={formData.startDate || undefined}
                disabled={submitted}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Time</label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                disabled={submitted}
                required
              />
            </div>

            <div className="form-group">
              <label>End Time</label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                min={
                  formData.startDate === formData.endDate
                    ? formData.startTime || undefined
                    : undefined
                }
                disabled={submitted}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Purpose</label>
            <textarea
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              placeholder="Enter the purpose of your reservation..."
              rows="4"
              disabled={submitted}
              required
            />
          </div>

          {message && (
            <div
              className={`form-message ${messageType}`}
              role="status"
            >
              {submitted ? (
                <strong>
                  Facility Reservation Submitted Successfully!
                </strong>
              ) : (
                message
              )}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading || submitted}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-save"
              disabled={loading || submitted}
            >
              {submitted
                ? "Reservation Submitted"
                : loading
                ? "Submitting..."
                : "Submit Reservation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FacilityReserveModal;
