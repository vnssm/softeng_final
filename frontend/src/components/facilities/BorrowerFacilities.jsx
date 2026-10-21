import React, { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
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
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:5000/api/facilities", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load facilities.");
      }

      if (!Array.isArray(data)) {
        throw new Error("The server returned an invalid facility list.");
      }

      setFacilities(
        data.map((facility) => {
          // Consistent status resolution
          let status = "Unavailable";

          if (
            facility.condition_status &&
            ["Available", "Unavailable", "Under maintenance"].includes(
              facility.condition_status
            )
          ) {
            status = facility.condition_status;
          } else if (Number(facility.is_available) === 1) {
            status = "Available";
          }

          return { ...facility, status };
        })
      );
    } catch (err) {
      console.error("Error loading facilities:", err);
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  // Compact header on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsHeaderCompact(currentScrollY > 40);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filtered = facilities.filter((facility) =>
    (facility.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const getFacilityStatus = (facility) =>
    facility.status ||
    (Number(facility.is_available) === 1 ? "Available" : "Unavailable");

  const openViewModal = (facility) => {
    setSelectedFacility(facility);
    setViewModalOpen(true);
  };

  const openReserveModal = () => {
    if (!selectedFacility || getFacilityStatus(selectedFacility) !== "Available") {
      return;
    }

    setViewModalOpen(false);
    setReserveModalOpen(true);
  };

  const closeAllModals = () => {
    setViewModalOpen(false);
    setReserveModalOpen(false);
    setSelectedFacility(null);
  };

  return (
    <div className="borrower-facilities">
      {/* Header and Search */}
      <div className={`facilities-header ${isHeaderCompact ? "compact" : ""}`}>
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
          <FaSearch className="search-icon" />
        </div>
      </div>

      {/* Loading */}
      {loading && <p>Loading facilities...</p>}

      {/* Error */}
      {!loading && error && (
        <div className="facility-message">
          <p>{error}</p>
          <button onClick={fetchFacilities}>Try Again</button>
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
              <div key={facility.id} className="facility-card">
                <div className="facility-image">
                  {facility.image_url ? (
                    <img
                      src={`http://localhost:5000${facility.image_url}`}
                      alt={facility.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  ) : (
                    <div className="image-placeholder" />
                  )}
                </div>

                <div className="facility-info">
                  <h3>{facility.name}</h3>

                  <p className="facility-desc">
                    {facility.description || "No description available."}
                  </p>

                  <p className="facility-status">
                    Status: {getFacilityStatus(facility)}
                  </p>
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