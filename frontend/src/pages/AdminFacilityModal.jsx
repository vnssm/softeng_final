import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import "./AdminEquipmentModal.css";
import { API_URL } from "../config";

function AdminFacilityModal({
  facility,
  isAddMode,
  onClose,
  onSuccess,
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    capacity: "",
    location: "",
    is_available: 1,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (facility && !isAddMode) {
      setForm({
        name: facility.name || "",
        description: facility.description || "",
        capacity: facility.capacity ?? "",
        location: facility.location || "",
        is_available:
          Number(facility.is_available) === 1 ? 1 : 0,
      });
    } else {
      setForm({
        name: "",
        description: "",
        capacity: "",
        location: "",
        is_available: 1,
      });
    }

    setError("");
  }, [facility, isAddMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.location.trim() ||
      form.capacity === ""
    ) {
      setError("Please complete all facility fields.");
      return;
    }

    const capacity = Number(form.capacity);

    if (
      !Number.isSafeInteger(capacity) ||
      capacity < 1 ||
      capacity > 200
    ) {
      setError("Capacity must be a whole number between 1 and 200.");
      return;
    }

    if (
      !isAddMode &&
      ![0, 1].includes(Number(form.is_available))
    ) {
      setError("Please select facility availability.");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in before saving a facility.");
      }

      const url = isAddMode
        ? `${API_URL}/facilities`
        : `${API_URL}/facilities/${facility.id}`;

      const requestData = {
        name: form.name.trim(),
        description: form.description.trim(),
        capacity,
        location: form.location.trim(),
        is_available: isAddMode
          ? 1
          : Number(form.is_available),
      };

      const response = await fetch(url, {
        method: isAddMode ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Unexpected server response. Check the backend and API route."
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save facility.");
      }

      onSuccess();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="admin-equipment-overlay"
      onClick={saving ? undefined : onClose}
    >
      <div
        className="admin-equipment-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-equipment-header">
          <h2>{isAddMode ? "Add Facility" : "Edit Facility"}</h2>

          <button
            type="button"
            className="admin-equipment-close"
            onClick={onClose}
            disabled={saving}
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-equipment-grid">
            <label className="admin-equipment-full">
              Facility Name *
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter facility name"
                maxLength={100}
                required
              />
            </label>

            <label className="admin-equipment-full">
              Description *
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter facility description"
                rows="3"
                required
              />
            </label>

            <label>
              Capacity *
              <input
                type="number"
                name="capacity"
                value={form.capacity}
                onChange={handleChange}
                placeholder="e.g. 100"
                min="1"
                max="200"
                step="1"
                required
              />
            </label>

            <label>
              Location *
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Enter facility location"
                required
              />
            </label>

            {!isAddMode && (
              <div className="admin-equipment-full">
                <span className="admin-equipment-label">
                  Availability *
                </span>

                <div className="admin-equipment-status">
                  {[
                    { value: 1, label: "Available" },
                    { value: 0, label: "Unavailable" },
                  ].map((status) => (
                    <button
                      type="button"
                      key={status.value}
                      className={
                        Number(form.is_available) === status.value
                          ? "selected"
                          : ""
                      }
                      onClick={() => {
                        setForm((currentForm) => ({
                          ...currentForm,
                          is_available: status.value,
                        }));
                        setError("");
                      }}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isAddMode && (
              <div className="admin-equipment-full">
                <span className="admin-equipment-label">
                  Availability
                </span>
                <p>Available (automatically set for new facilities)</p>
              </div>
            )}
          </div>

          {error && (
            <p className="admin-equipment-error" role="alert">
              {error}
            </p>
          )}

          <div className="admin-equipment-actions">
            <button
              type="button"
              className="admin-equipment-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="admin-equipment-save"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : isAddMode
                ? "Add Facility"
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminFacilityModal;