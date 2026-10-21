const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const allowedRoles = ["borrower", "personnel", "admin"];

const logAccountActivity = async (userId, actionType, description) => {
  try {
    await pool.query(
      `INSERT INTO activity_logs
       (user_id, action_type, description, related_type, related_id)
       VALUES (?, ?, ?, 'user', ?)`,
      [userId, actionType, description, userId]
    );
  } catch (error) {
    console.error("Account activity log error:", error.message);
  }
};

// GET ALL USERS
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT
        id,
        student_id,
        employee_id,
        admin_id,
        first_name,
        last_name,
        email,
        role,
        college_department,
        contact_number,
        is_active,
        created_at
      FROM users
      ORDER BY id DESC`
    );

    res.status(200).json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Failed to retrieve users." });
  }
};

// ADD USER
exports.createUser = async (req, res) => {
  try {
    const {
      student_id,
      employee_id,
      admin_id,
      first_name,
      last_name,
      email,
      password,
      role,
      college_department,
      contact_number,
    } = req.body;

    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({
        message: "Please complete all required fields.",
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid user role." });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    // Require the ID that matches the selected role.
    if (role === "borrower" && !student_id?.trim()) {
      return res.status(400).json({
        message: "Student ID is required for borrowers.",
      });
    }

    if (role === "personnel" && !employee_id?.trim()) {
      return res.status(400).json({
        message: "Employee ID is required for GSD personnel.",
      });
    }

    if (role === "admin" && !admin_id?.trim()) {
      return res.status(400).json({
        message: "Admin ID is required for administrators.",
      });
    }

    // Only save the ID that matches the selected role.
    const savedStudentId =
      role === "borrower" ? student_id.trim() : null;

    const savedEmployeeId =
      role === "personnel" ? employee_id.trim() : null;

    const savedAdminId =
      role === "admin" ? admin_id.trim() : null;

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email.trim()]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        message: "This email is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [userResult] = await pool.query(
      `INSERT INTO users (
        student_id,
        employee_id,
        admin_id,
        first_name,
        last_name,
        email,
        password,
        role,
        college_department,
        contact_number,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        savedStudentId,
        savedEmployeeId,
        savedAdminId,
        first_name.trim(),
        last_name.trim(),
        email.trim(),
        hashedPassword,
        role,
        college_department || null,
        contact_number || null,
      ]
    );

    await logAccountActivity(
      userResult.insertId,
      "account_created",
      "Account created by an administrator"
    );

    res.status(201).json({
      message: "User added successfully.",
    });
  } catch (error) {
    console.error("Create user error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        message: "This ID or email is already being used.",
      });
    }

    res.status(500).json({ message: "Failed to add user." });
  }
};

// EDIT USER
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const {
      student_id,
      employee_id,
      admin_id,
      first_name,
      last_name,
      email,
      role,
      college_department,
      contact_number,
    } = req.body;

    if (!first_name || !last_name || !email || !role) {
      return res.status(400).json({
        message: "Please complete all required fields.",
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid user role." });
    }

    // Require the ID that matches the selected role.
    if (role === "borrower" && !student_id?.trim()) {
      return res.status(400).json({
        message: "Student ID is required for borrowers.",
      });
    }

    if (role === "personnel" && !employee_id?.trim()) {
      return res.status(400).json({
        message: "Employee ID is required for GSD personnel.",
      });
    }

    if (role === "admin" && !admin_id?.trim()) {
      return res.status(400).json({
        message: "Admin ID is required for administrators.",
      });
    }

    const [existingRows] = await pool.query(
      "SELECT id, role FROM users WHERE id = ?",
      [userId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    // Prevent an administrator from changing their own role.
    if (
      Number(req.user.id) === Number(userId) &&
      role !== "admin"
    ) {
      return res.status(400).json({
        message: "You cannot change your own administrator role.",
      });
    }

    const [duplicateEmails] = await pool.query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email.trim(), userId]
    );

    if (duplicateEmails.length > 0) {
      return res.status(400).json({
        message: "This email is already registered to another user.",
      });
    }

    // Set the other role-specific IDs to NULL.
    // This prevents old IDs from remaining after a role change.
    const savedStudentId =
      role === "borrower" ? student_id.trim() : null;

    const savedEmployeeId =
      role === "personnel" ? employee_id.trim() : null;

    const savedAdminId =
      role === "admin" ? admin_id.trim() : null;

    await pool.query(
      `UPDATE users SET
        student_id = ?,
        employee_id = ?,
        admin_id = ?,
        first_name = ?,
        last_name = ?,
        email = ?,
        role = ?,
        college_department = ?,
        contact_number = ?
      WHERE id = ?`,
      [
        savedStudentId,
        savedEmployeeId,
        savedAdminId,
        first_name.trim(),
        last_name.trim(),
        email.trim(),
        role,
        college_department || null,
        contact_number || null,
        userId,
      ]
    );

    await logAccountActivity(
      userId,
      "account_updated",
      "Account details updated by an administrator"
    );

    res.status(200).json({
      message: "User updated successfully.",
    });
  } catch (error) {
    console.error("Update user error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        message: "This ID or email is already being used.",
      });
    }

    res.status(500).json({ message: "Failed to update user." });
  }
};

// DEACTIVATE USER
exports.deactivateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (Number(req.user.id) === Number(userId)) {
      return res.status(400).json({
        message: "You cannot deactivate your own account.",
      });
    }

    const [result] = await pool.query(
      "UPDATE users SET is_active = 0 WHERE id = ? AND is_active = 1",
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User not found or already inactive.",
      });
    }

    await logAccountActivity(
      userId,
      "account_deactivated",
      "Account deactivated by an administrator"
    );

    res.status(200).json({
      message: "User deactivated successfully.",
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({ message: "Failed to deactivate user." });
  }
};