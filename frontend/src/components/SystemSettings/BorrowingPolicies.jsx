import React from "react";
import { FaCheckCircle, FaRegCircle } from "react-icons/fa";
import "./BorrowingPolicies.css";

export default function BorrowingPolicies({ policiesData, onChange }) {
  const toggleSetting = (key) => {
    onChange({
      target: {
        name: key,
        value: !policiesData[key],
      },
    });
  };

  return (
    <div className="borrowing-policies-pane">
      <h2 className="borrowing-policies-title">Borrowing & Reservation Rules</h2>

      <div className="policies-list">
        {/* Policy Item 1: Auto-Detect Booking Conflicts */}
        <div
          className={`policy-card ${policiesData.autoDetectConflicts ? "active" : ""}`}
          onClick={() => toggleSetting("autoDetectConflicts")}
        >
          <div className="policy-info">
            <h3>Auto-Detect Booking Conflicts</h3>
            <p>Automatically flag double-bookings for facilities and equipment.</p>
          </div>
          <div className="policy-toggle">
            {policiesData.autoDetectConflicts ? (
              <FaCheckCircle className="check-icon checked" />
            ) : (
              <FaRegCircle className="check-icon" />
            )}
          </div>
        </div>

        {/* Policy Item 2: Require Physical Inspection on Return */}
        <div
          className={`policy-card ${policiesData.requireInspection ? "active" : ""}`}
          onClick={() => toggleSetting("requireInspection")}
        >
          <div className="policy-info">
            <h3>Require Physical Inspection on Return</h3>
            <p>Force return checklist verification before closing transaction.</p>
          </div>
          <div className="policy-toggle">
            {policiesData.requireInspection ? (
              <FaCheckCircle className="check-icon checked" />
            ) : (
              <FaRegCircle className="check-icon" />
            )}
          </div>
        </div>
      </div>

      {/* Number Input: Max Consecutive Borrowing Days */}
      <div className="policy-field-group">
        <label htmlFor="maxBorrowingDays">Max Consecutive Borrowing Days</label>
        <div className="number-input-wrapper">
          <input
            id="maxBorrowingDays"
            type="number"
            name="maxBorrowingDays"
            value={policiesData.maxBorrowingDays}
            onChange={onChange}
            min="1"
            max="365"
          />
        </div>
      </div>
    </div>
  );
}