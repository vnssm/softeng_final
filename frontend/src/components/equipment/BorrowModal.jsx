import React, { useState } from "react";
import "./BorrowModal.css";

const getNextLocalDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

function BorrowModal({ equipment, onClose, onSuccess }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const minDate = tomorrow.toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    quantity: "1",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    purpose: "",
    location: "",
    fulfillmentType: "pickup",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
<<<<<<< HEAD

    setFormData((previousData) => {
      const nextData = { ...previousData, [name]: value };

      if (name === "startDate") {
        nextData.endDate = "";
        nextData.startTime = "";
        nextData.endTime = "";
      }

      if (name === "startTime") {
        nextData.endTime = "";
      }

      return nextData;
    });

=======
    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
    setMessage("");
    setMessageType("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!equipment || !equipment.id) {
      setMessage("Equipment ID is missing. Please select the equipment again.");
      setMessageType("error");
      return;
    }

<<<<<<< HEAD
    const startDateValue = new Date(`${formData.startDate}T00:00:00`);
    const endDateValue = new Date(`${formData.endDate}T00:00:00`);

    if (Number.isNaN(startDateValue.getTime()) || Number.isNaN(endDateValue.getTime())) {
      setMessage("Invalid borrowing date. Please select a valid date.");
=======
    const quantity = Number(formData.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      setMessage("Quantity must be a whole number of at least 1.");
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
      setMessageType("error");
      return;
    }

<<<<<<< HEAD
    const earliestAllowedDate = new Date(`${minDate}T00:00:00`);

    if (startDateValue < earliestAllowedDate || endDateValue < earliestAllowedDate) {
      setMessage("Borrowing date must be tomorrow or in the future.");
=======
    const availableQuantity = Number(equipment.quantity_available);
    if (
      Number.isFinite(availableQuantity) &&
      quantity > availableQuantity
    ) {
      setMessage("Requested quantity exceeds the available quantity.");
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
      setMessageType("error");
      return;
    }

<<<<<<< HEAD
    const toMinutes = (timeValue) => {
      const [hours, minutes] = (timeValue || "").split(":").map(Number);

      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
      }

      return hours * 60 + minutes;
    };

    const startMinutes = toMinutes(formData.startTime);
    const endMinutes = toMinutes(formData.endTime);

    if (startMinutes === null || endMinutes === null) {
      setMessage("Please choose valid start and end times.");
=======
    if (
      !formData.startDate ||
      !formData.endDate ||
      !formData.startTime ||
      !formData.endTime
    ) {
      setMessage("Please complete the borrowing dates and times.");
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
      setMessageType("error");
      return;
    }

<<<<<<< HEAD
    if (startMinutes < 7 * 60 || endMinutes > 17 * 60 || endMinutes <= startMinutes) {
      setMessage("Borrowing time must be between 7:00 AM and 5:00 PM, and the end time must be later than the start time.");
=======
    if (
      !isValidDate(formData.startDate) ||
      !isValidDate(formData.endDate) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(formData.startTime) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(formData.endTime)
    ) {
      setMessage("Please enter valid borrowing dates and times.");
      setMessageType("error");
      return;
    }

    if (formData.startDate < getNextLocalDate()) {
      setMessage("Start date must be tomorrow or a future date.");
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
      setMessageType("error");
      return;
    }

    if (formData.endDate < formData.startDate) {
      setMessage("End date cannot be earlier than start date.");
      setMessageType("error");
      return;
    }

    if (
      formData.startTime < "07:30" ||
      formData.startTime > "17:00" ||
      formData.endTime < "07:30" ||
      formData.endTime > "17:00"
    ) {
      setMessage("Start and end times must be between 7:30 AM and 5:00 PM.");
      setMessageType("error");
      return;
    }

    const startDateTime = `${formData.startDate}T${formData.startTime}`;
    const endDateTime = `${formData.endDate}T${formData.endTime}`;

    if (endDateTime <= startDateTime) {
      setMessage("End date and time must be later than the start date and time.");
      setMessageType("error");
      return;
    }

    const purpose = formData.purpose.trim();
    const purposeLetterCount = Array.from(purpose).filter((character) =>
      /\p{L}/u.test(character)
    ).length;

    if (purpose.length < 10 || purposeLetterCount < 5) {
      setMessage("Please enter a clear purpose with at least 10 characters.");
      setMessageType("error");
      return;
    }

    const location = formData.location.trim();
    if (location.length < 3) {
      setMessage("Please enter a location with at least 3 characters.");
      setMessageType("error");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Your session has expired. Please log in again.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/borrowing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          equipmentId: equipment.id,
          quantity,
          startDate: formData.startDate,
          endDate: formData.endDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          purpose,
          location,
          fulfillmentType: formData.fulfillmentType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit request.");
      }

      setMessage(data.message || "Request submitted successfully!");
      setMessageType("success");
      setSubmitted(true);

      if (onSuccess) {
        onSuccess(data.request);
      }
    } catch (error) {
      setMessage(
        error.message || "Unable to submit request. Please try again."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{equipment?.name || "Equipment Name"}</h2>

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
          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number"
              name="quantity"
              min="1"
              max={equipment?.quantity_available ?? undefined}
              step="1"
              value={formData.quantity}
              onChange={handleChange}
              disabled={submitted}
              required
            />

            {equipment?.quantity_available != null && (
              <small>Available: {equipment.quantity_available}</small>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
<<<<<<< HEAD
                min={minDate}
=======
                min={getNextLocalDate()}
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
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
<<<<<<< HEAD
                min={formData.startDate || minDate}
                disabled={submitted || !formData.startDate}
=======
                min={formData.startDate || getNextLocalDate()}
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
                disabled={submitted || !formData.startDate}
=======
                min="07:30"
                max="17:00"
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
<<<<<<< HEAD
                  formData.startDate &&
                  formData.startDate === formData.endDate
                    ? formData.startTime || undefined
                    : "07:00"
                }
                max="17:00"
                disabled={submitted || !formData.startDate || !formData.startTime}
=======
                  formData.startDate === formData.endDate
                    ? formData.startTime > "07:30"
                      ? formData.startTime
                      : "07:30"
                    : "07:30"
                }
                max="17:00"
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
              placeholder="Explain why you need this equipment..."
              rows="4"
              minLength={10}
              maxLength={500}
              disabled={submitted}
              required
            />
          </div>

          <div className="form-group">
            <label>Location / Delivery Address</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              disabled={submitted}
              placeholder="Enter the venue or delivery location"
              minLength={3}
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label>Fulfillment Type</label>
            <select
              name="fulfillmentType"
              value={formData.fulfillmentType}
              onChange={handleChange}
              disabled={submitted}
              required
            >
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>

          {message && (
            <div className={`form-message ${messageType}`} role="status">
              {submitted ? (
                <strong>Borrowing Request Submitted Successfully!</strong>
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
                ? "Request Submitted"
                : loading
                  ? "Submitting..."
                  : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BorrowModal;