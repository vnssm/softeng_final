
import React, { useState, useEffect } from "react";
import BorrowModal from "./BorrowModal";
import "./BorrowerEquipment.css";
import { API_URL, API_BASE } from "../../config";

function BorrowerEquipment() {
  const [equipments, setEquipments] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get active equipment from the backend
  const fetchEquipment = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/equipment`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load equipment.");
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid equipment data received.");
      }

      // Display active equipment only
      const equipmentList = data
        .filter((item) => Number(item.is_active) === 1)
        .map((item) => {
          const rawConditionStatus = String(
            item.condition_status || ""
          )
            .trim()
            .toLowerCase()
            .replaceAll(" ", "_");

          const conditionStatus = {
            good: "Available",
            needs_repair: "Under maintenance",
            damaged: "Unavailable",
            available: "Available",
            unavailable: "Unavailable",
            under_maintenance: "Under maintenance",
          }[rawConditionStatus] ||
            (Number(item.is_available) === 1
              ? "Available"
              : "Unavailable");

          const status = conditionStatus;

          const available =
            status === "Available" &&
            Number(item.quantity_available) > 0;

          return {
            ...item,
            status,
            available,
          };
        });

      setEquipments(equipmentList);
    } catch (err) {
      console.error("Error loading equipment:", err);
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // Load equipment when the page opens
  useEffect(() => {
    fetchEquipment();
  }, []);

  // Open the borrowing modal
  const handleView = (equipment) => {
    if (!equipment.available) return;

    setSelectedEquipment(equipment);
    setIsModalOpen(true);
  };

  // Close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEquipment(null);
  };

  return (
    <div className="borrower-equipment">
      <div className="equipment-header">
        <h1>Equipment</h1>
        <p>Equipment of MMSU</p>
      </div>

      {loading && <p>Loading equipment...</p>}

      {!loading && error && (
        <div className="equipment-message">
          <p>{error}</p>
          <button onClick={fetchEquipment}>Try Again</button>
        </div>
      )}

      {!loading && !error && (
        <div className="equipment-grid">
          {equipments.length === 0 ? (
            <p>No active equipment is currently available for display.</p>
          ) : (
            equipments.map((item) => (
              <div key={item.id} className="equipment-card">
                <div className="equipment-image">
                  {item.image_url ? (
                    <img
                      src={`${API_BASE}${item.image_url}`}
                      alt={item.name}
                      className="equipment-photo"
                    />
                  ) : (
                    <div className="image-placeholder" />
                  )}
                </div>

                <div className="equipment-name">{item.name}</div>

                <div className="equipment-details">
                  <p>
                    Category: {item.category || "Not specified"}
                  </p>
                  <p>
                    Available: {item.quantity_available} /{" "}
                    {item.quantity_total}
                  </p>
                </div>

                <button
                  className={`equipment-btn ${
                    item.available
                      ? "available"
                      : item.status === "Under maintenance"
                        ? "maintenance"
                        : "unavailable"
                  }`}
                  onClick={() => handleView(item)}
                  disabled={!item.available}
                >
                  {item.status}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {isModalOpen && selectedEquipment && (
        <BorrowModal
          equipment={selectedEquipment}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

export default BorrowerEquipment;
