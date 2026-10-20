import React, { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";
import ManageModal from "./ManageModal";
import "./GSDEquipment.css";

function GSDEquipment() {
  const [equipments, setEquipments] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // Fetch equipment list
  const fetchEquipment = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/equipment", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load");
      setEquipments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const handleManage = (equipment) => {
    setSelectedEquipment(equipment);
    setIsAddMode(false);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedEquipment(null);
    setIsAddMode(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEquipment(null);
    setIsAddMode(false);
  };

  const handleSuccess = () => {
    closeModal();
    fetchEquipment(); // refresh list
  };

  const getStatusLabel = (item) => {
    if (!item.is_active) return "Unavailable";
    if (item.condition_status === "Needs Repair" || item.condition_status === "Damaged") {
      return "Under maintenance";
    }
    if (item.quantity_available <= 0) return "Unavailable";
    return "Available";
  };

  if (loading) {
    return (
      <div className="personnel-equipment">
        <p>Loading equipment...</p>
      </div>
    );
  }

  return (
    <div className="personnel-equipment">
      {/* Header */}
      <div className="equipment-header">
        <div>
          <h1>Equipment</h1>
          <p>Manage and update equipments</p>
        </div>

        <button className="add-equipment-btn" onClick={handleAdd}>
          <FaPlus /> Add Equipment
        </button>
      </div>

      {/* Equipment Grid */}
      <div className="equipment-grid">
        {equipments.length === 0 ? (
          <p>No equipment found. Click "Add Equipment" to create one.</p>
        ) : (
          equipments.map((item) => (
            <div key={item.id} className="equipment-card">
              <div className="equipment-image">
                <div className="image-placeholder"></div>
              </div>

              <div className="equipment-name">{item.name}</div>
              <div className="equipment-meta">
                Available: {item.quantity_available} / {item.quantity_total}
              </div>

              <button
                className="equipment-btn manage"
                onClick={() => handleManage(item)}
              >
                Manage
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal (Add or Edit) */}
      {isModalOpen && (
        <ManageModal
          equipment={selectedEquipment}
          isAddMode={isAddMode}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

export default GSDEquipment;