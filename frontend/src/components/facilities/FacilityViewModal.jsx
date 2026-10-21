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
              <span className={`status-badge ${status === "Available" ? "available" : "using"}`}>
                {status}
              </span>
            </div>
          </div>

          <button
            className={`reserve-btn facility-view-reserve ${isAvailable ? "" : "disabled-reserve"}`}
            onClick={isAvailable ? onReserve : undefined}
            disabled={!isAvailable}
            aria-disabled={!isAvailable}
          >
            Reserve
          </button>
        </div>
      </div>
    </div>
  );
}

export default FacilityViewModal;