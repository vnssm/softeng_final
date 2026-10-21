import React, { useState, useEffect } from "react";
import "./ManageModal.css";

function ManageModal({ equipment, isAddMode, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    quantity_total: 1,
    location: "",
    condition_status: "Good",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (equipment && !isAddMode) {
      setFormData({
        name: equipment.name || "",
        description: equipment.description || "",
        category: equipment.category || "",
        quantity_total: equipment.quantity_total || 1,
        location: equipment.location || "",
        condition_status: equipment.condition_status || "Good",
      });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const name = formData.name.trim();
    const quantity = Number(formData.quantity_total);
    if (!name) {
      setError("Equipment name is required.");
      return;
    }
    if (name.length > 150) {
      setError("Equipment name must be 150 characters or fewer.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 2147483647) {
      setError("Quantity must be a positive whole number.");
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
    if (!["Good", "Needs Repair", "Damaged"].includes(formData.condition_status)) {
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

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          name,
          quantity_total: quantity,
          category: formData.category.trim(),
          location: formData.location.trim(),
        }),
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
            <label>Equipment Name</label>
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
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter description..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g. AV Equipment, Furniture"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>Total Quantity</label>
            <input
              type="number"
              name="quantity_total"
              value={formData.quantity_total}
              onChange={handleChange}
              min="1"
              max="2147483647"
              step="1"
              required
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. GSD Storage Room"
              maxLength={150}
            />
          </div>

          <div className="form-group">
            <label>Condition / Status</label>
            <div className="status-buttons">
              <button
                type="button"
                aria-pressed={formData.condition_status === "Good"}
                className={`status-btn ${
                  formData.condition_status === "Good" ? "active" : ""
                }`}
                onClick={() => setStatus("Good")}
              >
                Good
              </button>
              <button
                type="button"
                aria-pressed={formData.condition_status === "Needs Repair"}
                className={`status-btn ${
                  formData.condition_status === "Needs Repair" ? "active" : ""
                }`}
                onClick={() => setStatus("Needs Repair")}
              >
                Needs Repair
              </button>
              <button
                type="button"
                aria-pressed={formData.condition_status === "Damaged"}
                className={`status-btn ${
                  formData.condition_status === "Damaged" ? "active" : ""
                }`}
                onClick={() => setStatus("Damaged")}
              >
                Damaged
              </button>
            </div>
          </div>

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