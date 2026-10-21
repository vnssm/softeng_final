import React, { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaUndo } from "react-icons/fa";
import AdminFacilityModal from "./AdminFacilityModal";
import "./UserManagement.css";

function FacilityManagement() {
  const [facilities, setFacilities] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFacilities = async () => {
    try {
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/facilities", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load facilities.");
      }

      setFacilities(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const getStatus = (item) => {
    if (Number(item.is_active) !== 1) {
      return "Inactive";
    }

    return Number(item.is_available) === 1
      ? "Available"
      : "Unavailable";
  };

  const filtered = facilities.filter((item) => {
    const matchesSearch =
      (item.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.location || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All Status" ||
      getStatus(item) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    setSelectedFacility(null);
    setIsAddMode(true);
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedFacility(item);
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
        `http://localhost:5000/api/facilities/${item.id}`,
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
        throw new Error(
          data.message || "Failed to update facility status."
        );
      }

      await fetchFacilities();
    } catch (err) {
      setError(err.message);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFacility(null);
    setIsAddMode(false);
  };

  const handleSuccess = () => {
    closeModal();
    fetchFacilities();
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <p>Loading facilities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-header">
          <div>
            <h1>Facility Management</h1>
            <p>Manage facilities and their schedules.</p>
          </div>
        </div>

        <div className="admin-toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search facilities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="role-select"
          >
            <option>All Status</option>
            <option>Available</option>
            <option>Unavailable</option>
            <option>Inactive</option>
          </select>

          <button className="add-btn" onClick={handleAdd}>
            <FaPlus /> Add Facility
          </button>
        </div>

        {error && <p className="user-message">{error}</p>}

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Capacity</th>
                <th>Location</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6">No facilities found.</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.name}</td>
                    <td>{item.capacity ?? "—"}</td>
                    <td>{item.location || "—"}</td>
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
                        title="Edit Facility"
                        onClick={() => handleEdit(item)}
                      >
                        <FaEdit />
                      </button>

                      {Number(item.is_active) === 1 ? (
                        <button
                          className="icon-btn deactivate"
                          title="Deactivate Facility"
                          onClick={() => handleToggleActive(item)}
                        >
                          <FaTrash />
                        </button>
                      ) : (
                        <button
                          className="icon-btn reactivate"
                          title="Reactivate Facility"
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
          <span>
            Showing {filtered.length} of {facilities.length} facilities
          </span>
        </div>
      </div>

      {isModalOpen && (
        <AdminFacilityModal
          facility={selectedFacility}
          isAddMode={isAddMode}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

export default FacilityManagement;