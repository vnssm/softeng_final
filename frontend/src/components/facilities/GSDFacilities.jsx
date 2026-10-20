import React, { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";
import ManageFacilityModal from "./ManageFacilityModal";
import "./GSDFacilities.css";

function GSDFacilities() {
  const [search, setSearch] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  const fetchFacilities = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/facilities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load");
      setFacilities(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const getStatus = (f) => {
    if (!f.is_active) return "Unavailable";
    if (!f.is_available) return "Unavailable";
    return "Available";
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
      <div className="facilities-header">
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
            <span className="search-icon">🔍</span>
          </div>

          <button className="add-facility-btn" onClick={handleAdd}>
            <FaPlus /> Add Facility
          </button>
        </div>
      </div>

      {/* Facilities List */}
      <div className="facilities-list">
        {filtered.length === 0 ? (
          <p>No facilities found.</p>
        ) : (
          filtered.map((facility) => (
            <div key={facility.id} className="facility-card">
              <div className="facility-image">
                <div className="image-placeholder"></div>
              </div>

              <div className="facility-info">
                <h3>{facility.name}</h3>
                <p className="facility-desc">
                  {facility.description || "No description"}
                </p>
                <span className={`status-badge ${getStatus(facility).toLowerCase().replace(" ", "-")}`}>
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