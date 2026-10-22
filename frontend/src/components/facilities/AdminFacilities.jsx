
import React, { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import "./AdminFacilities.css";
import { API_URL } from "../../config";

function AdminFacilities() {
  const [facilities, setFacilities] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/facilities`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load facilities.");
        }

        setFacilities(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Admin facilities error:", err);
        setError(err.message || "Unable to load facilities.");
      } finally {
        setLoading(false);
      }
    };

    fetchFacilities();
  }, []);

  const getStatus = (facility) => {
    if (Number(facility.is_active) !== 1) {
      return "Unavailable";
    }

    if (
      ["Available", "Unavailable", "Under maintenance"].includes(
        facility.condition_status
      )
    ) {
      return facility.condition_status;
    }

    return Number(facility.is_available) === 1 ? "Available" : "Unavailable";
  };

  const getStatusClass = (status) => {
    if (status === "Under maintenance") {
      return "facility-status-maintenance";
    }

    return status === "Available"
      ? "facility-status-available"
      : "facility-status-unavailable";
  };

  const filtered = facilities.filter((facility) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      (facility.name || "").toLowerCase().includes(searchText) ||
      String(facility.id).toLowerCase().includes(searchText) ||
      (facility.location || "").toLowerCase().includes(searchText);

    const matchesStatus =
      statusFilter === "All Status" ||
      getStatus(facility) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="admin-facilities">
        <p>Loading facilities...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-facilities">
        <div className="facilities-header">
          <div>
            <h1>Facility Management</h1>
            <p>
              View campus facilities, availability, and facility information
            </p>
          </div>
        </div>

        {error && (
          <div className="facility-empty-state">{error}</div>
        )}

        {!error && (
          <>
            <div className="facilities-toolbar">
              <div className="facility-search-box">
                <FaSearch className="facility-search-icon" />
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
                className="facility-status-select"
              >
                <option>All Status</option>
                <option>Available</option>
                <option>Unavailable</option>
                <option>Under maintenance</option>
              </select>
            </div>

            <div className="facilities-grid">
              {filtered.map((facility) => {
                const status = getStatus(facility);

                return (
                  <div
                    key={facility.id}
                    className="facility-admin-card"
                  >
                    <div className="facility-admin-image">
                      <div className="facility-image-placeholder">
                        <span>
                          {(facility.name || "F").charAt(0)}
                        </span>
                      </div>
                    </div>

                    <div className="facility-admin-info">
                      <div className="facility-admin-id">
                        FC-{String(facility.id).padStart(3, "0")}
                      </div>

                      <div className="facility-admin-name">
                        {facility.name}
                      </div>

                      <div className="facility-admin-description">
                        {facility.description || "No description available."}
                      </div>

                      <div className="facility-admin-meta">
                        <span>{facility.location || "Location not specified"}</span>
                        <span>•</span>
                        <span>
                          Capacity: {facility.capacity ?? "Not specified"}
                        </span>
                      </div>

                      <div className="facility-admin-footer">
                        <span
                          className={`facility-status-badge ${getStatusClass(status)}`}
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
              <div className="facility-empty-state">
                No facilities found.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminFacilities;
