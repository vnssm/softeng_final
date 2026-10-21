
import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import "./AdminEquipmentModal.css";

const normalizeConditionStatus = (status) => {
  if (status === "Good") return "Available";
  if (status === "Needs Repair") return "Under maintenance";
  if (status === "Damaged") return "Unavailable";
  return status;
};

function AdminEquipmentModal({
  equipment,
  isAddMode,
  onClose,
  onSuccess,
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    quantity_total: "",
    location: "",
    condition_status: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (equipment && !isAddMode) {
      setForm({
        name: equipment.name || "",
        description: equipment.description || "",
        category: equipment.category || "",
        quantity_total: equipment.quantity_total || 1,
        location: equipment.location || "",
        condition_status: normalizeConditionStatus(
          equipment.condition_status || "Available"
        ),
      });
    } else {
      setForm({
        name: "",
        description: "",
        category: "",
        quantity_total: "",
        location: "",
        condition_status: "",
      });
    }

    setError("");
  }, [equipment, isAddMode]);

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
      !form.category.trim() ||
      !form.description.trim() ||
      !form.location.trim()
    ) {
      setError("Please complete all equipment fields.");
      return;
    }

    const quantity = Number(form.quantity_total);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 500) {
      setError("Quantity must be a whole number between 1 and 500.");
      return;
    }
    if (
      !["Available", "Unavailable", "Under maintenance"].includes(
        form.condition_status
      )
    ) {
      setError("Select an equipment condition.");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("token");

      const url = isAddMode
        ? "http://localhost:5000/api/equipment"
        : `http://localhost:5000/api/equipment/${equipment.id}`;

      const response = await fetch(url, {
        method: isAddMode ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          quantity_total: Number(form.quantity_total),
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
        throw new Error(data.message || "Failed to save equipment.");
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
          <h2>{isAddMode ? "Add Equipment" : "Edit Equipment"}</h2>

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
            <label>
              Equipment Name *
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter equipment name"
                required
              />
            </label>

            <label>
              Category *
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="e.g. AV Equipment"
                required
              />
            </label>

            <label className="admin-equipment-full">
              Description *
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter equipment description"
                rows="3"
                required
              />
            </label>

            <label>
              Total Quantity *
              <input
                type="number"
                name="quantity_total"
                value={form.quantity_total}
                onChange={handleChange}
                min="1"
                max="500"
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
                placeholder="e.g. GSD Storage Room"
                required
              />
            </label>

            <div className="admin-equipment-full">
              <span className="admin-equipment-label">
                Condition / Status *
              </span>

              <div className="admin-equipment-status">
                {[
                  { value: "Available", label: "Available" },
                  { value: "Unavailable", label: "Unavailable" },
                  { value: "Under maintenance", label: "Under maintenance" },
                ].map((status) => (
                  <button
                    type="button"
                    key={status.value}
                    className={
                      form.condition_status === status.value
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setForm({
                        ...form,
                        condition_status: status.value,
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
                ? "Add Equipment"
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminEquipmentModal;
