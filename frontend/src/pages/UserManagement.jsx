
import React, { useEffect, useState } from "react";
import { FaSearch, FaPlus, FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import "./UserManagement.css";
import { API_URL } from "../config";

const emptyForm = {
  employee_id: "",
  student_id: "",
  admin_id: "",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  role: "borrower",
  college_department: "",
  contact_number: "",
};

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "The server returned an unexpected response. Check the backend terminal and API route."
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load users.");
      }

      setUsers(data);
    } catch (err) {
      setError(err.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleName = (role) => {
    if (role === "borrower") return "Borrower";
    if (role === "personnel") return "GSD Personnel";
    if (role === "admin") return "Administrator";
    return role || "Unknown";
  };

  const getStatusName = (isActive) => {
    return Number(isActive) === 1 ? "Active" : "Inactive";
  };

  const filteredUsers = users.filter((user) => {
    const fullName =
      `${user.first_name || ""} ${user.last_name || ""}`.trim();

    const matchesSearch =
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "All Roles" ||
      getRoleName(user.role) === roleFilter;

    return matchesSearch && matchesRole;
  });

  const openAddModal = () => {
    setEditId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditId(user.id);
    setForm({
      admin_id: user.admin_id || "",
      employee_id: user.employee_id || "",
      student_id: user.student_id || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      password: "",
      role: user.role || "borrower",
      college_department: user.college_department || "",
      contact_number: user.contact_number || "",
    });
    setMessage("");
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
    setForm(emptyForm);
    setMessage("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Contact number: numbers only, maximum 11 digits
    const newValue =
      name === "contact_number"
        ? value.replace(/[^0-9]/g, "").slice(0, 11)
        : value;

    if (name === "role") {
      setForm({
        ...form,
        role: newValue,
        student_id: "",
        employee_id: "",
        admin_id: "",
      });
    } else {
      setForm({
        ...form,
        [name]: newValue,
      });
    }
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      ...form,
      student_id: form.role === "borrower" ? form.student_id.trim() : "",
      employee_id: form.role === "personnel" ? form.employee_id.trim() : "",
      admin_id: form.role === "admin" ? form.admin_id.trim() : "",
    };

    // Never send a password when editing a user.
    if (editId) {
      delete payload.password;
    }

    try {
      const token = localStorage.getItem("token");

      const url = editId
        ? `${API_URL}/users/${editId}`
        : `${API_URL}/users`;

      const response = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "The server returned an unexpected response. Check the backend terminal and API route."
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save user.");
      }

      setMessage(data.message || "User saved successfully.");
      setModalOpen(false);
      setForm(emptyForm);
      setEditId(null);

      await fetchUsers();
    } catch (error) {
      setError(error.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (user) => {
    const confirmed = window.confirm(
      `Deactivate the account of ${user.first_name} ${user.last_name}? This user will no longer be able to log in.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/users/${user.id}/deactivate`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "The server returned an unexpected response. Check the backend terminal and API route."
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to deactivate user.");
      }

      setMessage(data.message || "User deactivated successfully.");
      await fetchUsers();
    } catch (err) {
      setMessage(err.message || "Unable to deactivate user.");
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-header">
          <div>
            <h1>User Management</h1>
            <p>Manage all system users and their roles.</p>
          </div>
        </div>

        <div className="admin-toolbar">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="role-select"
          >
            <option>All Roles</option>
            <option>Borrower</option>
            <option>GSD Personnel</option>
            <option>Administrator</option>
          </select>

          <button
            type="button"
            className="add-btn"
            onClick={openAddModal}
          >
            <FaPlus /> Add User
          </button>
        </div>

        {error && <p className="user-message">{error}</p>}
        {message && <p className="user-message">{message}</p>}

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">Loading users...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="6">{error}</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const status = getStatusName(user.is_active);

                  return (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.first_name} {user.last_name}</td>
                      <td>{user.email}</td>
                      <td>{getRoleName(user.role)}</td>
                      <td>
                        <span className={`status ${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="icon-btn edit"
                          title="Edit"
                          onClick={() => openEditModal(user)}
                        >
                          <FaEdit />
                        </button>

                        <button
                          type="button"
                          className="icon-btn delete"
                          title="Deactivate"
                          disabled={Number(user.is_active) !== 1}
                          onClick={() => handleDeactivate(user)}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span>
            Showing {filteredUsers.length} of {users.length} users
          </span>
        </div>
      </div>

      {modalOpen && (
        <div className="user-modal-overlay">
          <div className="user-modal">
            <div className="user-modal-header">
              <h2>{editId ? "Edit User" : "Add User"}</h2>
              <button
                type="button"
                className="user-modal-close"
                onClick={closeModal}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="user-form-grid">
                <label>
                  First Name *
                  <input
                    type="text"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    maxLength={100}
                    required
                  />
                </label>

                <label>
                  Last Name *
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    maxLength={100}
                    required
                  />
                </label>

                <label>
                  Email *
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    maxLength={150}
                    required
                  />
                </label>

                
                {!editId && (
                  <label>
                    Password *
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      minLength={8}
                      maxLength={72}
                      required
                    />
                  </label>
                )}

                <label>
                  Role *
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="borrower">Borrower</option>
                    <option value="personnel">GSD Personnel</option>
                    <option value="admin">Administrator</option>
                  </select>
                </label>

                <label>
                  Contact Number *
                  <input
                    type="tel"
                    name="contact_number"
                    value={form.contact_number}
                    onChange={handleChange}
                    inputMode="numeric"
                    pattern="[0-9]{11}"
                    minLength={11}
                    maxLength={11}
                    placeholder="e.g. 09991991909"
                    required
                  />
                </label>

                {form.role === "borrower" && (
                <label>
                  Student ID *
                  <input
                    name="student_id"
                    value={form.student_id}
                    onChange={handleChange}
                    required
                  />
                </label>
              )}

              {form.role === "personnel" && (
                <label>
                  Employee ID *
                  <input
                    name="employee_id"
                    value={form.employee_id}
                    onChange={handleChange}
                    required
                  />
                </label>
              )}

              {form.role === "admin" && (
                <label>
                  Admin ID *
                  <input
                    name="admin_id"
                    value={form.admin_id}
                    onChange={handleChange}
                    required
                  />
                </label>
              )}

                <label className="user-form-full">
                  College / Department
                  {form.role === "borrower" ? " *" : ""}

                  <input
                    name="college_department"
                    value={form.college_department}
                    onChange={handleChange}
                    maxLength={150}
                    required={form.role === "borrower"}
                  />
                </label>
              </div>

              <div className="user-modal-actions">
                <button
                  type="button"
                  className="user-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="user-save-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : editId ? "Save Changes" : "Add User"}
                </button>
              </div>

              {error && <p className="user-message">{error}</p>}
              {message && <p className="user-message">{message}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
