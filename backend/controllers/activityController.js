
const db = require("../config/db");

// Save a new activity
exports.logActivity = async (
  userId,
  actionType,
  description,
  relatedType = null,
  relatedId = null
) => {
  await db.query(
    `INSERT INTO activity_logs
      (user_id, action_type, description, related_type, related_id)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, actionType, description, relatedType, relatedId]
  );
};

// Get the logged-in user's activity history
exports.getMyActivities = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const [activities] = await db.query(
      `SELECT
          id,
          action_type,
          description,
          related_type,
          related_id,
          created_at
       FROM activity_logs
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    return res.status(200).json({ activities });
  } catch (error) {
    console.error("Get my activities error:", error);

    return res.status(500).json({
      message: "Failed to load activity history."
    });
  }
};

// Get all system activities for administrators
exports.getAllActivities = async (req, res) => {
  try {
    const [activities] = await db.query(
      `SELECT
          activity_logs.id,
          activity_logs.user_id,
          activity_logs.action_type,
          activity_logs.description,
          activity_logs.related_type,
          activity_logs.related_id,
          activity_logs.created_at,
          users.first_name,
          users.last_name,
          users.role
       FROM activity_logs
       LEFT JOIN users
          ON activity_logs.user_id = users.id
       ORDER BY activity_logs.created_at DESC,
                activity_logs.id DESC`
    );

    return res.status(200).json({ activities });
  } catch (error) {
    console.error("Get all activities error:", error);

    return res.status(500).json({
      message: "Failed to load system activity history."
    });
  }
};

// Record an export action by the logged-in user
exports.recordExportActivity = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { actionType, description } = req.body;

    const allowedActions = [
      "csv_exported",
      "system_report_exported",
      "weekly_system_report_exported",
      "audit_logs_exported",
      "weekly_audit_logs_exported"
    ];

    if (!allowedActions.includes(actionType)) {
      return res.status(400).json({
        message: "Invalid export activity."
      });
    }

    if (!description) {
      return res.status(400).json({
        message: "Activity description is required."
      });
    }

    await module.exports.logActivity(
      userId,
      actionType,
      description,
      "system",
      null
    );

    return res.status(201).json({
      message: "Export activity recorded."
    });
  } catch (error) {
    console.error("Record export activity error:", error);

    return res.status(500).json({
      message: "Failed to record export activity."
    });
  }
};
