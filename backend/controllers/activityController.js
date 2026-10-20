
const db = require("../config/db");

// Save a new activity
exports.logActivity = async (userId, actionType, description, relatedType = null, relatedId = null) => {
  await db.query(
    `INSERT INTO activity_logs
      (user_id, action_type, description, related_type, related_id)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, actionType, description, relatedType, relatedId]
  );
};

// Get the logged-in borrower's activity history
exports.getMyActivities = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const [activities] = await db.query(
      `SELECT id, action_type, description, related_type, related_id, created_at
       FROM activity_logs
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    return res.status(200).json({ activities });
  } catch (error) {
    console.error("Get activity history error:", error);

    return res.status(500).json({
      message: "Failed to load activity history."
    });
  }
};
