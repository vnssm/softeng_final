import React from "react";
import "./FacilityModals.css";

function FacilityViewModal({ facility, onClose, onReserve }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content facility-view-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{facility?.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="facility-modal-image">
            <div className="image-placeholder large"></div>
          </div>

          <div className="facility-modal-info">
            <p className="desc-label">Description</p>
            <p className="desc-text">{facility?.description}</p>

            <div className="status-row">
              <span>Status:</span>
              <span
                className={`status-badge ${facility?.status
                  ?.toLowerCase()
                  .replaceAll(" ", "-") || "unavailable"}`}
              >
                {facility?.status}
              </span>
            </div>
          </div>

          <button
            className="reserve-btn"
            onClick={onReserve}
            disabled={facility?.status !== "Available"}
          >
            {facility?.status === "Available"
              ? "Reserve"
              : "Reservations Unavailable"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FacilityViewModal;