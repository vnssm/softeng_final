import React, { useEffect, useState } from "react";
import { FaPlus, FaSearch } from "react-icons/fa";
import ManageFacilityModal from "./ManageFacilityModal";
import "./GSDFacilities.css";

function GSDFacilities() {
  const [search, setSearch] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const [error, setError] = useState("");

  const fetchFacilities = async () => {
    try {
      setError("");
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/facilities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load facilities.");
      }
      setFacilities(data);
    } catch (err) {
      setError(err.message || "Failed to load facilities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY) {
        setIsHeaderCompact(true);
      } else if (currentScrollY === 0) {
        setIsHeaderCompact(false);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getStatus = (f) => {
    if (Number(f.is_active) !== 1) return "Unavailable";
    if (
      ["Available", "Unavailable", "Under maintenance"].includes(
        f.condition_status
      )
    ) {
      return f.condition_status;
    }
    return Number(f.is_available) === 1 ? "Available" : "Unavailable";
  };

  const filtered = facilities.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const openManageModal = (facility) => {
    setSelectedFacility(facility);
    setIsAddMode(false);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedFacility(null);
    setIsAddMode(true);
    setIsModalOpen(true);
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
      <div className="personnel-facilities">
        <p>Loading facilities...</p>
      </div>
    );
  }

  return (
    <div className="personnel-facilities">
      {/* Header + Search + Add */}
      <div className={`facilities-header ${isHeaderCompact ? "compact" : ""}`}>
        <div>
          <h1>Facilities</h1>
          <p>Manage and update facilities</p>
        </div>

        <div className="header-right">
          <div className="search-box">
            <input
              type="text"
              placeholder="search for facilities....."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <FaSearch className="search-icon" />
          </div>

          <button className="add-facility-btn" onClick={handleAdd}>
            <FaPlus /> Add Facility
          </button>
        </div>
      </div>

      {/* Facilities List */}
      <div className="facilities-list">
        {error ? (
          <p role="alert">{error}</p>
        ) : filtered.length === 0 ? (
          <p>No facilities found.</p>
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
                    }}
                  />
                ) : (
                  <div className="image-placeholder"></div>
                )}
              </div>

              <div className="facility-info">
                <h3>{facility.name}</h3>
                <p className="facility-desc">
                  {facility.description || "No description"}
                </p>
                <span className={`status-badge ${getStatus(facility).toLowerCase().replaceAll(" ", "-")}`}>
                  {getStatus(facility)}
                </span>
              </div>

              <button
                className="manage-btn"
                onClick={() => openManageModal(facility)}
              >
                Manage
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <ManageFacilityModal
          facility={selectedFacility}
          isAddMode={isAddMode}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

export default GSDFacilities;