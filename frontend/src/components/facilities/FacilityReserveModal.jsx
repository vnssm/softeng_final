
import React, { useState } from "react";
import "./FacilityModals.css";

function FacilityReserveModal({ facility, onClose }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const minDate = tomorrow.toISOString().split("T")[0];

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

  const isFacilityAvailable = Number(facility?.is_available) === 1;

  const toMinutes = (timeString) => {
    if (!timeString) return null;

    const [hours, minutes] = timeString.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }

    return hours * 60 + minutes;
  };

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

    if (loading || submitted || !isFacilityAvailable) {
      return;
    }

    if (
      !formData.startDate ||
      !formData.endDate ||
      !formData.startTime ||
<<<<<<< HEAD
      !formData.endTime
=======
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
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
    ) {
      setMessage("Please enter a start and end date and time.");
      setMessageType("error");
      return;
    }

    const startDateValue = new Date(`${formData.startDate}T00:00:00`);
    const endDateValue = new Date(`${formData.endDate}T00:00:00`);

    if (Number.isNaN(startDateValue.getTime()) || Number.isNaN(endDateValue.getTime())) {
      setMessage("Invalid date entered. Please choose a valid reservation date.");
      setMessageType("error");
      return;
    }

    const earliestAllowedDate = new Date(minDate + "T00:00:00");

    if (startDateValue < earliestAllowedDate || endDateValue < earliestAllowedDate) {
      setMessage("Reservation date must be tomorrow or in the future.");
      setMessageType("error");
      return;
    }

    const startMinutes = toMinutes(formData.startTime);
    const endMinutes = toMinutes(formData.endTime);

    if (startMinutes === null || endMinutes === null) {
      setMessage("Please choose valid start and end times.");
      setMessageType("error");
      return;
    }

    if (startMinutes < 7 * 60 || endMinutes > 17 * 60 || endMinutes <= startMinutes) {
      setMessage("Reservation time must be between 7:00 AM and 5:00 PM, and the end time must be later than the start time.");
      setMessageType("error");
      return;
    }

    if (formData.purpose.trim().length < 5) {
      setMessage("Purpose must be at least 5 characters long.");
      setMessageType("error");
      return;
    }

    if (formData.endDate < formData.startDate || (formData.startDate === formData.endDate && formData.endTime <= formData.startTime)) {
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
                min={minDate}
                disabled={submitted || !isFacilityAvailable}
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
<<<<<<< HEAD
                min={formData.startDate || minDate}
                disabled={submitted || !isFacilityAvailable}
=======
                min={formData.startDate || undefined}
                disabled={submitted}
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
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
<<<<<<< HEAD
                min="07:00"
                max="17:00"
                disabled={submitted || !isFacilityAvailable}
=======
                disabled={submitted}
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
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
                  formData.startDate &&
                  formData.startDate === formData.endDate
                    ? formData.startTime || undefined
                    : "07:00"
                }
<<<<<<< HEAD
                max="17:00"
                disabled={submitted || !isFacilityAvailable}
=======
                disabled={submitted}
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
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
              disabled={submitted || !isFacilityAvailable}
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
              disabled={loading || submitted || !isFacilityAvailable}
            >
              {!isFacilityAvailable
                ? "Unavailable"
                : submitted
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
