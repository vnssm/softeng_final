import React from "react";
import "./FacilityModals.css";

function FacilityViewModal({ facility, onClose, onReserve }) {
  const isAvailable = Number(facility?.is_available) === 1;
  const status =
    facility?.status ||
    (isAvailable ? "Available" : "Unavailable");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content facility-view-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header facility-view-header">
          <h2>{facility?.name}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close facility details">×</button>
        </div>

        <div className="modal-body facility-view-body">
          <div className="facility-modal-image">
            <div className="image-placeholder large"></div>
          </div>

          <div className="facility-modal-info">
            <p className="desc-label">Description</p>
            <p className="desc-text">{facility?.description}</p>

            <div className="status-row">
              <span>Status:</span>
<<<<<<< HEAD
              <span className={`status-badge ${status === "Available" ? "available" : "using"}`}>
                {status}
=======
              <span
                className={`status-badge ${facility?.status
                  ?.toLowerCase()
                  .replaceAll(" ", "-") || "unavailable"}`}
              >
                {facility?.status}
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
              </span>
            </div>
          </div>

          <button
<<<<<<< HEAD
            className={`reserve-btn facility-view-reserve ${isAvailable ? "" : "disabled-reserve"}`}
            onClick={isAvailable ? onReserve : undefined}
            disabled={!isAvailable}
            aria-disabled={!isAvailable}
          >
            Reserve
=======
            className="reserve-btn"
            onClick={onReserve}
            disabled={facility?.status !== "Available"}
          >
            {facility?.status === "Available"
              ? "Reserve"
              : "Reservations Unavailable"}
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
          </button>
        </div>
      </div>
    </div>
  );
}

export default FacilityViewModal;