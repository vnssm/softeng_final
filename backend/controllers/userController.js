
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { notifyAdmins } = require("../utils/notificationHelper");

const allowedRoles = ["borrower", "personnel", "admin"];

// Record account activity

const logAccountActivity = async (
  actorUserId,
  actionType,
  description,
  relatedId = null
) => {
  try {
    await pool.query(
      `INSERT INTO activity_logs
       (user_id, action_type, description, related_type, related_id)
       VALUES (?, ?, ?, 'user', ?)`,
      [actorUserId, actionType, description, relatedId]
    );
  } catch (error) {
    console.error("Account activity log error:", error.message);
  }
};

// Validate user information
const validateUserInput = (data, isEditing = false) => {
  if (!data || typeof data !== "object") {
    return "Invalid user information.";
  }

  const {
    first_name,
    last_name,
    email,
    password,
    role,
    student_id,
    employee_id,
    admin_id,
    college_department,
    contact_number,
  } = data;

  if (
    typeof first_name !== "string" ||
    typeof last_name !== "string" ||
    typeof email !== "string" ||
    !role
  ) {
    return "Please complete all required fields.";
  }

  const firstName = first_name.trim();
  const lastName = last_name.trim();
  const cleanEmail = email.trim();

  if (!firstName || !lastName || !cleanEmail) {
    return "First name, last name, and email are required.";
  }

  // Validate names
  if (firstName.length > 100 || lastName.length > 100) {
    return "Names must not exceed 100 characters.";
  }

  if (
    !/^[\p{L}\p{M} .'-]+$/u.test(firstName) ||
    !/^[\p{L}\p{M} .'-]+$/u.test(lastName)
  ) {
    return "Names may contain letters, spaces, apostrophes, periods, and hyphens only.";
  }

  // Validate email
  if (
    cleanEmail.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    return "Please enter a valid email address.";
  }

  // Validate role
  if (!allowedRoles.includes(role)) {
    return "Please select a valid user type.";
  }

  // Validate password when creating an account
  if (!isEditing) {
    if (typeof password !== "string" || !password.trim()) {
      return "Password is required.";
    }

    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }

    if (password.length > 72) {
      return "Password must not exceed 72 characters.";
    }
  }

  // Validate the ID required for each role
  if (role === "borrower") {
    if (typeof student_id !== "string" || !student_id.trim()) {
      return "Student ID is required for borrowers.";
    }

    if (student_id.trim().length > 50) {
      return "Student ID must not exceed 50 characters.";
    }

    if (
      typeof college_department !== "string" ||
      !college_department.trim()
    ) {
      return "College / Department is required for borrowers.";
    }
  }

  if (role === "personnel") {
    if (typeof employee_id !== "string" || !employee_id.trim()) {
      return "Employee ID is required for GSD personnel.";
    }

    if (employee_id.trim().length > 50) {
      return "Employee ID must not exceed 50 characters.";
    }
  }

  if (role === "admin") {
    if (typeof admin_id !== "string" || !admin_id.trim()) {
      return "Admin ID is required for administrators.";
    }

    if (admin_id.trim().length > 50) {
      return "Admin ID must not exceed 50 characters.";
    }
  }

  // Contact number must contain exactly 11 digits
  if (
    typeof contact_number !== "string" ||
    !/^[0-9]{11}$/.test(contact_number)
  ) {
    return "Contact number must contain exactly 11 digits.";
  }

  // Validate college/department length
  if (
    college_department &&
    college_department.length > 150
  ) {
    return "College / Department must not exceed 150 characters.";
  }

  return "";
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

    const validationError = validateUserInput(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    // Save only the ID matching the selected role
    const savedStudentId =
      role === "borrower" ? student_id.trim() : null;

    const savedEmployeeId =
      role === "personnel" ? employee_id.trim() : null;

    const savedAdminId =
      role === "admin" ? admin_id.trim() : null;

    // Check for duplicate email
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
        college_department && college_department.trim()
          ? college_department.trim()
          : null,
        contact_number,
      ]
    );

    await logAccountActivity(
      req.user.id,
      "user_added",
      "Added " + role + " account: " +
        first_name.trim() + " " + last_name.trim(),
      userResult.insertId
    );

    await notifyAdmins(
      "New User Account Added",
      "A new " + role + " account was created for " +
        first_name.trim() + " " + last_name.trim() + ".",
      "account",
      "user_account_created"
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

    const validationError = validateUserInput(req.body, true);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const [existingRows] = await pool.query(
      "SELECT id, role FROM users WHERE id = ?",
      [userId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    // Prevent an administrator from changing their own role
    if (
      Number(req.user.id) === Number(userId) &&
      role !== "admin"
    ) {
      return res.status(400).json({
        message: "You cannot change your own administrator role.",
      });
    }

    // Check for duplicate email
    const [duplicateEmails] = await pool.query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email.trim(), userId]
    );

    if (duplicateEmails.length > 0) {
      return res.status(400).json({
        message: "This email is already registered to another user.",
      });
    }

    // Clear IDs that do not match the selected role
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
        college_department && college_department.trim()
          ? college_department.trim()
          : null,
        contact_number,
        userId,
      ]
    );

    await logAccountActivity(
      req.user.id,
      "user_edited",
      "Edited user account: " +
        first_name.trim() + " " + last_name.trim(),
      userId
    );

    await notifyAdmins(
      "User Profile Updated",
      "The account details for " +
        first_name.trim() + " " + last_name.trim() +
        " were updated.",
      "account",
      "user_profile_updated"
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

    const [users] = await pool.query(
      `SELECT first_name, last_name, role
      FROM users
      WHERE id = ? AND is_active = 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found or already inactive."
      });
    }

    const removedUser = users[0];

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
      req.user.id,
      "user_soft_removed",
      "Soft-removed " + removedUser.role +
        " account: " + removedUser.first_name +
        " " + removedUser.last_name,
      userId
    );

    await notifyAdmins(
      "User Account Deactivated",
      "User account ID " + userId + " was deactivated.",
      "account",
      "user_account_deactivated"
    );
    res.status(200).json({
      message: "User deactivated successfully.",
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({
      message: "Failed to deactivate user.",
    });
  }
};
