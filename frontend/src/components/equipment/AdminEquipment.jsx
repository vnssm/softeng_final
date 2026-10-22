
import React, { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import "./AdminEquipment.css";
import { API_URL } from "../../config";

function AdminEquipment() {
  const [equipments, setEquipments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/equipment`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load equipment.");
        }

        setEquipments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Admin equipment error:", err);
        setError(err.message || "Unable to load equipment.");
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, []);

  const getStatus = (item) => {
    if (!item.is_active) return "Unavailable";

    if (
      item.condition_status === "Under maintenance" ||
      item.condition_status === "Needs Repair"
    ) {
      return "Under Maintenance";
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

  const getStatusClass = (status) => {
    switch (status) {
      case "Available":
        return "status-available";
      case "Under Maintenance":
        return "status-maintenance";
      case "Unavailable":
        return "status-damaged";
      default:
        return "";
    }
  };

  const filtered = equipments.filter((item) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      (item.name || "").toLowerCase().includes(searchText) ||
      (item.category || "").toLowerCase().includes(searchText) ||
      String(item.id).toLowerCase().includes(searchText);

    const matchesStatus =
      statusFilter === "All Status" ||
      getStatus(item) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="admin-equipment">
        <p>Loading equipment...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-equipment">
        <div className="equipment-header">
          <div>
            <h1>Equipment Management</h1>
            <p>
              View campus equipment, condition, and availability
            </p>
          </div>
        </div>

        {error && <p className="empty-state">{error}</p>}

        {!error && (
          <>
            <div className="equipment-toolbar">
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-select"
              >
                <option>All Status</option>
                <option>Available</option>
                <option>Under Maintenance</option>
                <option>Unavailable</option>
              </select>
            </div>

            <div className="equipment-grid">
              {filtered.map((item) => {
                const status = getStatus(item);

                return (
                  <div key={item.id} className="equipment-card">
                    <div className="equipment-image">
                      <div className="image-placeholder">
                        <span>
                          {(item.name || "E").charAt(0)}
                        </span>
                      </div>
                    </div>

                    <div className="equipment-info">
                      <div className="equipment-id">
                        EQ-{String(item.id).padStart(3, "0")}
                      </div>

                      <div className="equipment-name">
                        {item.name}
                      </div>

                      <div className="equipment-meta">
                        <span>{item.category || "Uncategorized"}</span>
                        <span>•</span>
                        <span>
                          {item.quantity_available ?? 0}/
                          {item.quantity_total ?? 0} available
                        </span>
                      </div>

                      <div className="equipment-footer">
                        <span
                          className={`status-badge ${getStatusClass(status)}`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="empty-state">
                No equipment found.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminEquipment;
