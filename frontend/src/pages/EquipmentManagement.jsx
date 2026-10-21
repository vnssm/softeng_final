
import React, { useEffect, useState } from "react";
import { FaSearch, FaPlus, FaEdit, FaTrash, FaUndo } from "react-icons/fa";
import AdminEquipmentModal from "./AdminEquipmentModal";
import "./UserManagement.css";

function EquipmentManagement() {
  const [equipments, setEquipments] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEquipment = async () => {
    try {
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/equipment", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load equipment.");
      }

      setEquipments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const getStatus = (item) => {
    if (!item.is_active) {
      return "Unavailable";
    }

    if (
      item.condition_status === "Under maintenance" ||
      item.condition_status === "Needs Repair"
    ) {
      return "Under maintenance";
    }

    if (
      item.condition_status === "Unavailable" ||
      item.condition_status === "Damaged"
    ) {
      return "Unavailable";
    }

    if (Number(item.quantity_available) <= 0) {
      return "Unavailable";
    }

    return "Available";
  };

  const categories = [
    ...new Set(equipments.map((item) => item.category).filter(Boolean)),
  ];

  const filtered = equipments.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.category || "").toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "All Categories" ||
      item.category === categoryFilter;

    const matchesStatus =
      statusFilter === "All Status" || getStatus(item) === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleAdd = () => {
    setSelectedEquipment(null);
    setIsAddMode(true);
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedEquipment(item);
    setIsAddMode(false);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (item) => {
    const isActive = Number(item.is_active) === 1;

    const action = isActive ? "deactivate" : "reactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${item.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `http://localhost:5000/api/equipment/${item.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            is_active: isActive ? 0 : 1,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update equipment status.");
      }

      await fetchEquipment();
    } catch (err) {
      setError(err.message);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEquipment(null);
    setIsAddMode(false);
  };

  const handleSuccess = () => {
    closeModal();
    fetchEquipment();
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <p>Loading equipment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-header">
          <div>
            <h1>Equipment Management</h1>
            <p>Manage equipment inventory and status.</p>
          </div>
        </div>

        <div className="admin-toolbar">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search equipment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="role-select"
          >
            <option>All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="role-select"
          >
            <option>All Status</option>
            <option>Available</option>
            <option>Unavailable</option>
            <option>Under maintenance</option>
          </select>

          <button className="add-btn" onClick={handleAdd}>
            <FaPlus /> Add Equipment
          </button>
        </div>

        {error && <p className="user-message">{error}</p>}

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Total Qty.</th>
                <th>Available</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7">No equipment found.</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.name}</td>
                    <td>{item.category || "—"}</td>
                    <td>{item.quantity_total}</td>
                    <td>{item.quantity_available}</td>
                    <td>
                      <span
                        className={`status ${
                          getStatus(item) === "Available"
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {getStatus(item)}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        className="icon-btn edit"
                        title="Edit Equipment"
                        onClick={() => handleEdit(item)}
                      >
                        <FaEdit />
                      </button>

                      {Number(item.is_active) === 1 ? (
                        <button
                          className="icon-btn deactivate"
                          title="Deactivate Equipment"
                          onClick={() => handleToggleActive(item)}
                        >
                          <FaTrash />
                        </button>
                      ) : (
                        <button
                          className="icon-btn reactivate"
                          title="Reactivate Equipment"
                          onClick={() => handleToggleActive(item)}
                        >
                          <FaUndo />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span>Showing {filtered.length} of {equipments.length} equipment</span>
        </div>
      </div>

      {isModalOpen && (
        <AdminEquipmentModal
          equipment={selectedEquipment}
          isAddMode={isAddMode}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

export default EquipmentManagement;
