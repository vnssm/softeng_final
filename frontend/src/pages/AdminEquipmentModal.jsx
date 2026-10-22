import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import "./AdminEquipmentModal.css";

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
    equipment_status: "Available",
    condition_status: "Good",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (equipment && !isAddMode) {
      setForm({
        name: equipment.name || "",
        description: equipment.description || "",
        category: equipment.category || "",
        quantity_total: equipment.quantity_total ?? 1,
        location: equipment.location || "",
        equipment_status: equipment.equipment_status || "Available",
        condition_status: equipment.condition_status || "Good",
      });
    } else {
      setForm({
        name: "",
        description: "",
        category: "",
        quantity_total: "",
        location: "",
        equipment_status: "Available",
        condition_status: "Good",
      });
    }

    setError("");
  }, [equipment, isAddMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setError("");
  };

  const handleStatusChange = (name, value) => {
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
      !form.category.trim() ||
      !form.description.trim() ||
      !form.location.trim()
    ) {
      setError("Please complete all equipment fields.");
      return;
    }

    const quantity = Number(form.quantity_total);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 500
    ) {
      setError("Quantity must be a whole number between 1 and 500.");
      return;
    }

    if (
      !["Available", "Unavailable", "Under Maintenance"].includes(
        form.equipment_status
      )
    ) {
      setError("Please select a valid equipment status.");
      return;
    }

    if (
      !["Good", "Needs Repair", "Damaged"].includes(
        form.condition_status
      )
    ) {
      setError("Please select a valid equipment condition.");
      return;
    }

    setSaving(true);

    try {
      const token =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const url = isAddMode
        ? "http://localhost:5000/api/equipment"
        : `http://localhost:5000/api/equipment/${equipment.id}`;

      const equipmentData = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        quantity_total: quantity,
        location: form.location.trim(),
        equipment_status: form.equipment_status,
        condition_status: form.condition_status,
      };

      const response = await fetch(url, {
        method: isAddMode ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(equipmentData),
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
    <div
      className="admin-equipment-overlay"
      onClick={saving ? undefined : onClose}
    >
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
              <small>Enter a quantity from 1 to 500.</small>
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
                Equipment Status *
              </span>

              <div className="admin-equipment-status">
                {[
                  { value: "Available", label: "Available" },
                  { value: "Unavailable", label: "Unavailable" },
                  {
                    value: "Under Maintenance",
                    label: "Under Maintenance",
                  },
                ].map((status) => (
                  <button
                    type="button"
                    key={status.value}
                    className={
                      form.equipment_status === status.value
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      handleStatusChange("equipment_status", status.value)
                    }
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-equipment-full">
              <span className="admin-equipment-label">
                Condition Status *
              </span>

              <div className="admin-equipment-status">
                {[
                  { value: "Good", label: "Good" },
                  { value: "Needs Repair", label: "Needs Repair" },
                  { value: "Damaged", label: "Damaged" },
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
                      handleStatusChange("condition_status", status.value)
                    }
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
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