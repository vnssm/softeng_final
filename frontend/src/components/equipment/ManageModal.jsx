import React, { useState, useEffect } from "react";
import "./ManageModal.css";

const normalizeConditionStatus = (status) => {
  if (status === "Good") return "Available";
  if (status === "Needs Repair") return "Under maintenance";
  if (status === "Damaged") return "Unavailable";
  return status;
};

function ManageModal({ equipment, isAddMode, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    quantity_total: "",
    location: "",
    condition_status: "Available",
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedImage(null);

    if (equipment && !isAddMode) {
      setFormData({
        name: equipment.name || "",
        description: equipment.description || "",
        category: equipment.category || "",
        quantity_total: equipment.quantity_total || 1,
        location: equipment.location || "",
        condition_status: normalizeConditionStatus(
          equipment.condition_status || "Available"
        ),
      });
      setPreviewUrl(
        equipment.image_url
          ? `http://localhost:5000${equipment.image_url}`
          : ""
      );
    } else {
      setFormData({
        name: "",
        description: "",
        category: "",
        quantity_total: "",
        location: "",
        condition_status: "Available",
      });

      setPreviewUrl("");
    }
  }, [equipment, isAddMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const setStatus = (status) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      condition_status: status,
    }));
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
    const quantity = Number(formData.quantity_total);
    if (!name) {
      setError("Equipment name is required.");
      return;
    }
    if (!formData.description.trim()) {
      setError("Equipment description is required.");
      return;
    }
    if (!formData.category.trim()) {
      setError("Equipment category is required.");
      return;
    }
    if (!formData.location.trim()) {
      setError("Equipment location is required.");
      return;
    }
    if (name.length > 150) {
      setError("Equipment name must be 150 characters or fewer.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
      setError("Quantity must be a whole number between 1 and 500.");
      return;
    }
    if (formData.category.trim().length > 100) {
      setError("Category must be 100 characters or fewer.");
      return;
    }
    if (formData.location.trim().length > 150) {
      setError("Location must be 150 characters or fewer.");
      return;
    }
    if (new TextEncoder().encode(formData.description.trim()).length > 65535) {
      setError("Description is too long.");
      return;
    }
    if (
      !["Available", "Unavailable", "Under maintenance"].includes(
        formData.condition_status
      )
    ) {
      setError("Select a valid equipment condition.");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const url = isAddMode
        ? "http://localhost:5000/api/equipment"
        : `http://localhost:5000/api/equipment/${equipment.id}`;

      const method = isAddMode ? "POST" : "PUT";
      const payload = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value);
      });

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

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong");
      }

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
        className="modal-content manage-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{isAddMode ? "Add Equipment" : "Manage Equipment"}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Equipment Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter equipment name"
              maxLength={150}
              required
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter description..."
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label>Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select a category</option>
              <option value="Computers & Laptops">Computers &amp; Laptops</option>
              <option value="Displays & Monitors">Displays &amp; Monitors</option>
              <option value="Audio/Visual (A/V) Equipment">
                Audio/Visual (A/V) Equipment
              </option>
              <option value="Equipment">Equipment</option>
              <option value="Furniture">Furniture</option>
            </select>
          </div>

          <div className="form-group">
            <label>Total Quantity *</label>
            <input
              type="number"
              name="quantity_total"
              value={formData.quantity_total}
              onChange={handleChange}
              placeholder="e.g. 200"
              min="1"
              max="500"
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
              placeholder="e.g. GSD Storage Room"
              maxLength={150}
              required
            />
          </div>

          <div className="form-group">
            <label>Equipment Photo</label>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {previewUrl && (
              <div style={{ marginTop: "10px" }}>
                <img
                  src={previewUrl}
                  alt="Equipment preview"
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
              <label>Condition / Status *</label>
              <div className="status-buttons">
                <button
                  type="button"
                  aria-pressed={formData.condition_status === "Available"}
                  className={`status-btn ${
                    formData.condition_status === "Available" ? "active" : ""
                  }`}
                  onClick={() => setStatus("Available")}
                >
                  Available
                </button>
                <button
                  type="button"
                  aria-pressed={formData.condition_status === "Unavailable"}
                  className={`status-btn ${
                    formData.condition_status === "Unavailable" ? "active" : ""
                  }`}
                  onClick={() => setStatus("Unavailable")}
                >
                  Unavailable
                </button>
                <button
                  type="button"
                  aria-pressed={
                    formData.condition_status === "Under maintenance"
                  }
                  className={`status-btn ${
                    formData.condition_status === "Under maintenance"
                      ? "active"
                      : ""
                  }`}
                  onClick={() => setStatus("Under maintenance")}
                >
                  Under maintenance
                </button>
              </div>
            </div>
          )}

          {error && (
            <p style={{ color: "red", fontSize: "14px" }}>{error}</p>
          )}

          <div className="modal-actions">
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? "Saving..." : isAddMode ? "Add Equipment" : "Save"}
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

export default ManageModal;