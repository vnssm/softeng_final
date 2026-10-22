
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Save an audit log without exposing sensitive information
const saveAuditLog = async (userId, action, req) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs
        (user_id, action, table_name, record_id, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId || null,
        action,
        "users",
        userId || null,
        req.ip,
      ]
    );
  } catch (error) {
    console.error("Audit log error:", error.message);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? AND is_active = 1",
      [email]
    );

    if (rows.length === 0) {
      await saveAuditLog(null, "Failed Login Attempt", req);

      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      await saveAuditLog(
        user.id,
        "Failed Login Attempt",
        req
      );

      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    pool
      .query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id])
      .catch((error) => {
        console.error("Last login update error:", error.message);
      });

    void saveAuditLog(user.id, "User Login", req);

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    delete user.password;

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        college_department: user.college_department,
        profile_image: user.profile_image,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


exports.logout = async (req, res) => {
  await saveAuditLog(
    req.user.id,
    "User Logout",
    req
  );

  res.status(200).json({
    message: "Logout recorded successfully",
  });
};
