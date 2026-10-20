
import React, { useState, useEffect } from "react";
import FacilityViewModal from "./FacilityViewModal";
import FacilityReserveModal from "./FacilityReserveModal";
import "./BorrowerFacilities.css";

function BorrowerFacilities() {
  const [search, setSearch] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get facilities from the backend
  const fetchFacilities = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/facilities",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load facilities."
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("The server returned an invalid facility list.");
      }

      setFacilities(data);
    } catch (err) {
      console.error("Error loading facilities:", err);
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // Load facilities when the page opens
  useEffect(() => {
    fetchFacilities();
  }, []);

  // Search facilities by name
  const filtered = facilities.filter((facility) =>
    (facility.name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Open facility details
  const openViewModal = (facility) => {
    setSelectedFacility(facility);
    setViewModalOpen(true);
  };

  // Open reservation modal
  const openReserveModal = () => {
    setViewModalOpen(false);
    setReserveModalOpen(true);
  };

  // Close all modals
  const closeAllModals = () => {
    setViewModalOpen(false);
    setReserveModalOpen(false);
    setSelectedFacility(null);
  };

  return (
    <div className="borrower-facilities">
      {/* Header and Search */}
      <div className="facilities-header">
        <div>
          <h1>Facilities</h1>
          <p>Facilities of MMSU</p>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search for facilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      {/* Loading */}
      {loading && <p>Loading facilities...</p>}

      {/* Error */}
      {!loading && error && (
        <div className="facility-message">
          <p>{error}</p>
          <button onClick={fetchFacilities}>
            Try Again
          </button>
        </div>
      )}

      {/* Facilities List */}
      {!loading && !error && (
        <div className="facilities-list">
          {filtered.length === 0 ? (
            <p>
              {search
                ? "No facilities match your search."
                : "No facilities have been listed yet."}
            </p>
          ) : (
            filtered.map((facility) => (
              <div
                key={facility.id}
                className="facility-card"
              >
                <div className="facility-image">
                  <div className="image-placeholder"></div>
                </div>

                <div className="facility-info">
                  <h3>{facility.name}</h3>

                  <p className="facility-desc">
                    {facility.description ||
                      "No description available."}
                  </p>

                  {facility.status && (
                    <p className="facility-status">
                      Status: {facility.status}
                    </p>
                  )}
                </div>

                <button
                  className="view-btn"
                  onClick={() => openViewModal(facility)}
                >
                  View
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Facility Details Modal */}
      {viewModalOpen && selectedFacility && (
        <FacilityViewModal
          facility={selectedFacility}
          onClose={closeAllModals}
          onReserve={openReserveModal}
        />
      )}

      {/* Facility Reservation Modal */}
      {reserveModalOpen && selectedFacility && (
        <FacilityReserveModal
          facility={selectedFacility}
          onClose={closeAllModals}
        />
      )}
    </div>
  );
}

export default BorrowerFacilities;
