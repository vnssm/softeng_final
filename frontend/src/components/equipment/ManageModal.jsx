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
    setFormData({ ...formData, condition_status: status });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
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
        body: JSON.stringify(formData),
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
            />
          </div>

          <div className="form-group">
            <label>Condition / Status</label>
            <div className="status-buttons">
              <button
                type="button"
                className={`status-btn ${
                  formData.condition_status === "Good" ? "active" : ""
                }`}
                onClick={() => setStatus("Good")}
              >
                Available (Good)
              </button>
              <button
                type="button"
                className={`status-btn ${
                  formData.condition_status === "Needs Repair" ? "active" : ""
                }`}
                onClick={() => setStatus("Needs Repair")}
              >
                Under maintenance
              </button>
              <button
                type="button"
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