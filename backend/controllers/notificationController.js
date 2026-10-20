
const db = require("../config/db");

// Check for upcoming and overdue requests
async function createAutomaticNotifications(userId) {
  // Reminder for approved requests starting today or tomorrow
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
     SELECT
       r.user_id,
       'Upcoming Request',
       CONCAT(
         'Your request for ',
         COALESCE(
           (
             SELECT GROUP_CONCAT(e.name SEPARATOR ', ')
             FROM request_items ri
             INNER JOIN equipment e ON ri.equipment_id = e.id
             WHERE ri.request_id = r.id
           ),
           f.name,
           'your requested resource'
         ),
         ' is scheduled for ',
         DATE_FORMAT(r.date_needed, '%M %e, %Y'),
         '.'
       ),
       'warning',
       'upcoming_request',
       r.id
     FROM requests r
     LEFT JOIN facilities f ON r.facility_id = f.id
     WHERE r.user_id = ?
       AND r.status IN ('approved', 'for_delivery', 'for_pickup')
       AND r.date_needed BETWEEN CURDATE()
           AND DATE_ADD(CURDATE(), INTERVAL 1 DAY)
       AND NOT EXISTS (
         SELECT 1
         FROM notifications n
         WHERE n.user_id = r.user_id
           AND n.related_request_id = r.id
           AND n.event_type = 'upcoming_request'
       )`,
    [userId]
  );

  // Reminder for requests whose end date has passed
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
     SELECT
       r.user_id,
       'Overdue Request',
       CONCAT(
         'The scheduled end date for your request for ',
         COALESCE(
           (
             SELECT GROUP_CONCAT(e.name SEPARATOR ', ')
             FROM request_items ri
             INNER JOIN equipment e ON ri.equipment_id = e.id
             WHERE ri.request_id = r.id
           ),
           f.name,
           'your requested resource'
         ),
         ' was ',
         DATE_FORMAT(r.date_end, '%M %e, %Y'),
         '. Please check its current status.'
       ),
       'error',
       'overdue_request',
       r.id
     FROM requests r
     LEFT JOIN facilities f ON r.facility_id = f.id
     WHERE r.user_id = ?
       AND r.status IN (
         'approved',
         'for_delivery',
         'for_pickup',
         'ongoing',
         'overdue'
       )
       AND r.date_end < CURDATE()
       AND NOT EXISTS (
         SELECT 1
         FROM notifications n
         WHERE n.user_id = r.user_id
           AND n.related_request_id = r.id
           AND n.event_type = 'overdue_request'
       )`,
    [userId]
  );
}

// Get notifications for the logged-in borrower
exports.getMyNotifications = async (req, res) => {
  const userId = req.user.id || req.user.userId;

  if (!userId) {
    return res.status(401).json({
      message: "User information is missing. Please log in again."
    });
  }

  try {
    // Create any reminders that are currently needed
    if (req.user.role === "borrower") {
      await createAutomaticNotifications(userId);
    }

    // Retrieve the borrower's notifications
    const [notifications] = await db.query(
      `SELECT
         id,
         title,
         message,
         event_type AS type,
         is_read,
         related_request_id,
         created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    return res.status(200).json({
      notifications
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      message: "Failed to load notifications."
    });
  }
};

// Mark one notification as read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const notificationId = req.params.id;

    const [result] = await db.query(
      `UPDATE notifications
       SET is_read = 1
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Notification not found."
      });
    }

    return res.status(200).json({
      message: "Notification marked as read."
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    return res.status(500).json({
      message: "Failed to update notification."
    });
  }
};
