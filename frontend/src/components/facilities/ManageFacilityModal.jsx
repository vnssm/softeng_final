import React, { useState, useEffect } from "react";
import "./ManageFacilityModal.css";
import { API_URL, API_BASE } from "../../config";

function ManageFacilityModal({ facility, isAddMode, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capacity: "",
    location: "",
    status: "Available",
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedImage(null);

    if (facility && !isAddMode) {
      setFormData({
        name: facility.name || "",
        description: facility.description || "",
        capacity: facility.capacity || "",
        location: facility.location || "",
        status:
          Number(facility.is_active) !== 1
            ? "Unavailable"
            : facility.condition_status ||
              (Number(facility.is_available) === 1
                ? "Available"
                : "Unavailable"),
      });
      setPreviewUrl(
        facility.image_url
          ? `${API_BASE}${facility.image_url}`
          : ""
      );
    } else {
      setFormData({
        name: "",
        description: "",
        capacity: "",
        location: "",
        status: "Available",
      });

      setPreviewUrl("");
    }
  }, [facility, isAddMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError("");
    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));
  };

  const setStatus = (status) => {
    setFormData((currentFormData) => ({ ...currentFormData, status }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const name = formData.name.trim();
    const capacity = formData.capacity === "" ? null : Number(formData.capacity);
    if (!name) {
      setError("Facility name is required.");
      return;
    }
    if (!formData.description.trim()) {
      setError("Facility description is required.");
      return;
    }
    if (formData.capacity === "") {
      setError("Facility capacity is required.");
      return;
    }
    if (!formData.location.trim()) {
      setError("Facility location is required.");
      return;
    }
    if (isAddMode && !selectedImage) {
      setError("Facility photo is required.");
      return;
    }
    if (name.length > 150) {
      setError("Facility name must be 150 characters or fewer.");
      return;
    }
    if (new TextEncoder().encode(formData.description.trim()).length > 65535) {
      setError("Description is too long.");
      return;
    }
    if (
      capacity === null ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 1000
    ) {
      setError("Capacity must be a whole number between 1 and 1000.");
      return;
    }
    if (!["Available", "Unavailable", "Under maintenance"].includes(formData.status)) {
      setError("Select a valid facility status.");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const url = isAddMode
        ? `${API_URL}/facilities`
        : `${API_URL}/facilities/${facility.id}`;

      const method = isAddMode ? "POST" : "PUT";
      const payload = new FormData();

      payload.append("name", formData.name);
      payload.append("description", formData.description || "");
      payload.append("capacity", formData.capacity || "");
      payload.append("location", formData.location || "");
      payload.append("is_available", formData.status === "Available" ? "1" : "0");
      payload.append("condition_status", formData.status);

      if (selectedImage) {
        payload.append("image", selectedImage);
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content manage-facility-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{isAddMode ? "Add Facility" : "Manage Facility"}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Facility Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter facility name"
              maxLength={150}
              required
            />
          </div>

          <div className="form-group">
            <label>Facility Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter description..."
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label>Capacity *</label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              placeholder="e.g. 200"
              min="1"
              max="1000"
              step="1"
              required
            />
          </div>

          <div className="form-group">
            <label>Location *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Main Campus"
              maxLength={150}
              required
            />
          </div>

          <div className="form-group">
            <label>Facility Photo {isAddMode ? "*" : ""}</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required={isAddMode}
            />
            {previewUrl && (
              <div style={{ marginTop: "10px" }}>
                <img
                  src={previewUrl}
                  alt="Facility preview"
                  style={{
                    width: "100%",
                    maxHeight: "180px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    border: "1px solid #ddd",
                  }}
                />
              </div>
            )}
          </div>

          {!isAddMode && (
            <div className="form-group">
              <label>State of facility *</label>
              <div className="status-buttons">
                <button
                  type="button"
                  aria-pressed={formData.status === "Available"}
                  className={`status-btn ${
                    formData.status === "Available" ? "active" : ""
                  }`}
                  onClick={() => setStatus("Available")}
                >
                  Available
                </button>
                <button
                  type="button"
                  aria-pressed={formData.status === "Unavailable"}
                  className={`status-btn ${
                    formData.status === "Unavailable" ? "active" : ""
                  }`}
                  onClick={() => setStatus("Unavailable")}
                >
                  Unavailable
                </button>
                <button
                  type="button"
                  aria-pressed={formData.status === "Under maintenance"}
                  className={`status-btn ${
                    formData.status === "Under maintenance" ? "active" : ""
                  }`}
                  onClick={() => setStatus("Under maintenance")}
                >
                  Under maintenance
                </button>
              </div>
            </div>
          )}

          {error && <p style={{ color: "red", fontSize: "14px" }}>{error}</p>}

          <div className="modal-actions">
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? "Saving..." : isAddMode ? "Add Facility" : "Save"}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ManageFacilityModal;