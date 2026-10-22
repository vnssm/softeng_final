
import React, { useEffect, useRef, useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import "./profile.css";
import { API_URL, API_BASE } from "../config";

function InfoItem({ label, value }) {
  return (
    <div className="profile-info-item">
      <div className="profile-info-label">{label}</div>
      <div className="profile-info-value">{value || "Not provided"}</div>
    </div>
  );
}

function RecordItem({ name, details, status }) {
  return (
    <div className="profile-record">
      <div className="profile-record-top">
        <div className="profile-record-name">{name}</div>

        {status && (
          <span className={"profile-status " + status.toLowerCase()}>
            {status.replace("_", " ")}
          </span>
        )}
      </div>

      <div className="profile-record-details">{details}</div>
    </div>
  );
}

function formatDate(date) {
  if (!date) return "Date not set";

  const parts = String(date).slice(0, 10).split("-");

  if (parts.length !== 3) return date;

  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  ).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatTime(time) {
  if (!time) return "";

  const parts = String(time).split(":");
  const hour = Number(parts[0]);

  const date = new Date();
  date.setHours(hour, Number(parts[1]), 0, 0);

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    student_id: "",
    employee_id: "",
    contact_number: "",
    college_department: ""
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please log in to view your profile.");
        return;
      }

      const response = await fetch(API_URL + "/profile/me", {
        headers: {
          Authorization: "Bearer " + token
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load profile.");
      }

      setProfile(data);

      setForm({
        first_name: data.user.first_name || "",
        last_name: data.user.last_name || "",
        email: data.user.email || "",
        student_id: data.user.student_id || "",
        employee_id: data.user.employee_id || "",
        contact_number: data.user.contact_number || "",
        college_department: data.user.college_department || ""
      });
    } catch (err) {
      setError(err.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProfilePictureChange(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("The image must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingPicture(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("profile_image", file);

      const response = await fetch(API_URL + "/profile/picture", {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload picture.");
      }

      await loadProfile();
      window.dispatchEvent(new Event("profileUpdated"));
      setSuccess("Profile picture updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to upload picture.");
    } finally {
      setUploadingPicture(false);
      event.target.value = "";
    }
  }

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    setSuccess("");
    setError("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(API_URL + "/profile/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update profile.");
      }

      await loadProfile();
      setEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    }
  }

  if (loading) {
    return <div className="profile-message">Loading profile...</div>;
  }

  if (error && !profile) {
    return (
      <div className="profile-message">
        <p>{error}</p>
        <button onClick={loadProfile}>Try Again</button>
      </div>
    );
  }

  if (!profile) return null;

  const user = profile.user;

  const roleLabel =
  user.role === "admin"
    ? "Administrator"
    : user.role === "personnel"
    ? "GSD Personnel"
    : "Borrower";

const userIdLabel =
  user.role === "borrower" ? "Student ID" : "Employee ID";

const userIdValue =
  user.role === "borrower" ? user.student_id : user.employee_id;

  const fullName =
    (user.first_name || "") + " " + (user.last_name || "");

  const initials =
    ((user.first_name || "").charAt(0) +
      (user.last_name || "").charAt(0)).toUpperCase() || "U";

  return (
    <div className="profile-page">
      <main className="profile-main">
        <div className="profile-container">

          <section className="profile-header">
            <div
              className="profile-avatar profile-avatar-editable"
              onClick={() => fileInputRef.current.click()}
              title="Click to change profile picture"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current.click();
                }
              }}
            >
              {user.profile_image ? (
                <img
                  src={
                    user.profile_image.startsWith("http")
                      ? user.profile_image
                      : API_BASE + user.profile_image
                  }
                  alt="Profile"
                />
              ) : (
                initials
              )}

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleProfilePictureChange}
                style={{ display: "none" }}
              />
            </div>

            <div className="profile-heading">
              <div>
                <h1>{fullName.trim()}</h1>
                <p className="profile-role">{roleLabel}</p>
              </div>

            </div>
          </section>

          {error && <p className="profile-error">{error}</p>}

          {success && <p className="profile-success">{success}</p>}

          
          <section className="profile-grid">
            <div className="profile-column">
              {/* User Details */}
              <div className="profile-card">
                <div className="profile-card-header">
                  <h2>User Details</h2>

                  <button
                    className="edit-profile-btn"
                    onClick={() => setEditing(!editing)}
                  >
                    {editing ? "Cancel" : "Edit profile"}
                  </button>
                </div>

                {editing ? (
                  <form className="profile-edit-form" onSubmit={handleSave}>
                    <label>
                      First Name
                      <input
                        name="first_name"
                        value={form.first_name}
                        onChange={handleChange}
                        required
                      />
                    </label>

                    <label>
                      Last Name
                      <input
                        name="last_name"
                        value={form.last_name}
                        onChange={handleChange}
                        required
                      />
                    </label>

                    <label>
                      Email Address
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                      />
                    </label>

                    <label>
                      {user.role === "borrower" ? "Student ID" : "Employee ID"}
                      <input
                        name={
                          user.role === "borrower" ? "student_id" : "employee_id"
                        }
                        value={
                          user.role === "borrower"
                            ? form.student_id
                            : form.employee_id
                        }
                        onChange={handleChange}
                        required
                      />
                    </label>

                    <label>
                      Contact Number
                      <input
                        name="contact_number"
                        value={form.contact_number}
                        onChange={handleChange}
                      />
                    </label>

                    <label>
                      College / Department
                      <input
                        name="college_department"
                        value={form.college_department}
                        onChange={handleChange}
                      />
                    </label>

                    <button type="submit" className="profile-save-btn">
                      Save Changes
                    </button>
                  </form>
                ) : (
                  <div className="profile-info">
                    <InfoItem label="Email Address" value={user.email} />
                    <InfoItem label={userIdLabel} value={userIdValue} />
                    <InfoItem
                      label="College / Department"
                      value={user.college_department}
                    />
                    <InfoItem
                      label="Contact Number"
                      value={user.contact_number}
                    />
                  </div>
                )}
              </div>

              {/* Borrowing history: borrowers only */}
              {user.role === "borrower" && (
                <div className="profile-card">
                  <div className="profile-card-header">
                    <h2>Equipment Borrowing History</h2>
                  </div>

                  <div className="profile-record-list">
                    {(profile.equipment || []).length > 0 ? (
                      profile.equipment.map((item) => (
                        <RecordItem
                          key={item.request_id + "-" + item.equipment_name}
                          name={item.equipment_name}
                          details={
                            "Quantity: " + item.quantity +
                            "\nStart: " + formatDate(item.date_needed) +
                            "\nEnd: " + formatDate(item.date_end) +
                            "\nTime: " + formatTime(item.time_start) +
                            " - " + formatTime(item.time_end)
                          }
                          status={item.status}
                        />
                      ))
                    ) : (
                      <p className="profile-empty">
                        You have no equipment borrowing requests yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="profile-column">
              {/* Login Activity */}
              <div className="profile-card">
                <div className="profile-card-header">
                  <h2>Login Activity</h2>
                </div>

                <div className="login-activity">
                  <div className="activity-item">
                    <div className="activity-label">Last logged in</div>
                    <div className="activity-value">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleString("en-PH", {
                            dateStyle: "full",
                            timeStyle: "short"
                          })
                        : "No login time recorded yet"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity: all roles */}
              <div className="profile-card">
                <div className="profile-card-header">
                  <h2>Recent Activity</h2>
                </div>

                <div className="login-activity">
                  {(profile.activities || []).length > 0 ? (
                    profile.activities.map((item, index) => (
                      <div className="activity-item" key={index}>
                        <div className="activity-label">
                          {(item.action_type || "Activity").replace(/_/g, " ")}
                        </div>

                        <div className="activity-value">
                          {item.description}
                          <br />
                          {new Date(item.created_at).toLocaleString("en-PH")}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="profile-empty">
                      No recent activity recorded.
                    </p>
                  )}
                </div>
              </div>

              {/* Facility reservations: borrowers only */}
              {user.role === "borrower" && (
                <div className="profile-card">
                  <div className="profile-card-header">
                    <h2>Facility Reservations</h2>
                  </div>

                  <div className="profile-record-list">
                    {(profile.facilities || []).length > 0 ? (
                      profile.facilities.map((item) => (
                        <RecordItem
                          key={item.request_id}
                          name={item.facility_name}
                          details={
                            "Start: " + formatDate(item.date_needed) +
                            "\nEnd: " + formatDate(item.date_end) +
                            "\nTime: " + formatTime(item.time_start) +
                            " - " + formatTime(item.time_end)
                          }
                          status={item.status}
                        />
                      ))
                    ) : (
                      <p className="profile-empty">
                        You have no facility reservations yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
