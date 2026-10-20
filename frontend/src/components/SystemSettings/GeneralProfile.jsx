import React from "react";
import "./GeneralProfile.css";

export default function GeneralProfile({ formData, onChange }) {
  return (
    <div className="general-profile-pane">
      <h2 className="general-profile-title">Directorate Organization Profile</h2>
      
      <div className="general-profile-grid">
        <div className="profile-form-group">
          <label htmlFor="officeName">Directorate Office Name</label>
          <input
            id="officeName"
            type="text"
            name="officeName"
            value={formData.officeName}
            onChange={onChange}
            placeholder="e.g. General Services Directorate"
          />
        </div>

        <div className="profile-form-group">
          <label htmlFor="contactEmail">Official Contact Email</label>
          <input
            id="contactEmail"
            type="email"
            name="contactEmail"
            value={formData.contactEmail}
            onChange={onChange}
            placeholder="e.g. gsd@mmsu.edu.ph"
          />
        </div>

        <div className="profile-form-group">
          <label htmlFor="operatingHours">Operating Hours</label>
          <input
            id="operatingHours"
            type="text"
            name="operatingHours"
            value={formData.operatingHours}
            onChange={onChange}
            placeholder="e.g. 8:00 AM - 5:00 PM"
          />
        </div>

        <div className="profile-form-group">
          <label htmlFor="campusLocation">Primary Campus Location</label>
          <input
            id="campusLocation"
            type="text"
            name="campusLocation"
            value={formData.campusLocation}
            onChange={onChange}
            placeholder="e.g. Batac City, Ilocos Norte"
          />
        </div>
      </div>
    </div>
  );
}