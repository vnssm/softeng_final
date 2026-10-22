
const db = require("../config/db");

// Send a notification to all active admin accounts
exports.notifyAdmins = async (title, message, type, eventType) => {
  try {
    await db.query(
      `INSERT INTO notifications
        (user_id, title, message, type, event_type)
       SELECT
        id, ?, ?, ?, ?
       FROM users
       WHERE role = 'admin'
         AND is_active = 1`,
      [title, message, type, eventType]
    );
  } catch (error) {
    console.error("Admin notification error:", error);
  }
};
