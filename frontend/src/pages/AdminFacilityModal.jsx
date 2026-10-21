import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import "./AdminEquipmentModal.css";

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
    is_available: "",
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
        is_available: Number(facility.is_available) === 1 ? 1 : 0,
      });
    } else {
      setForm({
        name: "",
        description: "",
        capacity: "",
        location: "",
        is_available: "",
      });
    }

    setError("");
  }, [facility, isAddMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value,
    });
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
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 1000) {
      setError("Capacity must be a whole number between 1 and 1000.");
      return;
    }
    if (![0, 1].includes(Number(form.is_available))) {
      setError("Select facility availability.");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("token");

      const url = isAddMode
        ? "http://localhost:5000/api/facilities"
        : `http://localhost:5000/api/facilities/${facility.id}`;

      const response = await fetch(url, {
        method: isAddMode ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          capacity,
          is_available: Number(form.is_available),
        }),
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
    <div className="admin-equipment-overlay" onClick={onClose}>
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
                max="1000"
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
                    onClick={() =>
                      setForm({
                        ...form,
                        is_available: status.value,
                      })
                    }
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <p className="admin-equipment-error">{error}</p>
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