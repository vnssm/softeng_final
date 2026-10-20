
const db = require("../config/db");

const notifyAdmins = async (title, message, eventType, requestId) => {
  try {
    // Find all active system administrators
    const [admins] = await db.query(
      `SELECT id
       FROM users
       WHERE role = 'admin'
         AND is_active = 1`
    );

    // Create a notification for each administrator
    for (const admin of admins) {
      await db.query(
        `INSERT INTO notifications
          (
            user_id,
            title,
            message,
            type,
            event_type,
            related_request_id
          )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          admin.id,
          title,
          message,
          "info",
          eventType,
          requestId || null,
        ]
      );
    }
  } catch (error) {
    console.error("Admin notification error:", error.message);
  }
};

module.exports = notifyAdmins;
