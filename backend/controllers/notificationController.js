
const db = require("../config/db");

async function insertNotification({
  userId,
  title,
  message,
  type = "info",
  eventType,
  requestId,
}) {
  if (!userId || !title || !message || !eventType) {
    return;
  }

  await db.query(
    `INSERT INTO notifications
     (user_id, title, message, type, event_type, related_request_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, title, message, type, eventType, requestId || null]
  );
}

async function notifyUsers({
  userIds,
  title,
  message,
  type = "info",
  eventType,
  requestId,
}) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return;
  }

  for (const userId of userIds) {
    await insertNotification({
      userId,
      title,
      message,
      type,
      eventType,
      requestId,
    });
  }
}

async function notifyGSDPersonnel({ title, message, type = "info", eventType, requestId }) {
  const [personnelUsers] = await db.query(
    `SELECT id
     FROM users
     WHERE role IN ('personnel', 'admin')
       AND is_active = 1`
  );

  await notifyUsers({
    userIds: personnelUsers.map((personnel) => personnel.id),
    title,
    message,
    type,
    eventType,
    requestId,
  });
}

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
       CASE
         WHEN LOWER(COALESCE(r.fulfillment_type, '')) = 'pickup' THEN 'Pickup Schedule'
         WHEN LOWER(COALESCE(r.fulfillment_type, '')) = 'delivery' THEN 'Delivery Schedule'
         ELSE 'Upcoming Request'
       END,
       CONCAT(
         'Your ',
         CASE
           WHEN r.request_type = 'equipment' THEN 'equipment request'
           WHEN r.request_type = 'facility' THEN 'facility reservation'
           ELSE 'request'
         END,
         ' for ',
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
         CASE
           WHEN LOWER(COALESCE(r.fulfillment_type, '')) = 'pickup' THEN 'pickup'
           WHEN LOWER(COALESCE(r.fulfillment_type, '')) = 'delivery' THEN 'delivery'
           ELSE 'processing'
         END,
         ' on ',
         DATE_FORMAT(r.date_needed, '%M %e, %Y'),
         '.'
       ),
       'warning',
       'request_schedule',
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
           AND n.event_type = 'request_schedule'
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

// Create a weekly audit log report notification for admins
async function createWeeklyAuditNotifications() {
  await db.query(
    `INSERT INTO notifications
      (user_id, title, message, type, event_type)
     SELECT
       u.id,
       'Weekly Audit Logs Report Ready',
       'Your weekly report for audit logs is ready.',
       'audit_logs',
       'weekly_audit_report_ready'
     FROM users u
     WHERE u.role = 'admin'
       AND u.is_active = 1
       AND NOT EXISTS (
         SELECT 1
         FROM notifications n
         WHERE n.user_id = u.id
           AND n.event_type = 'weekly_audit_report_ready'
           AND YEARWEEK(n.created_at, 3) = YEARWEEK(CURDATE(), 3)
       )`
  );
}

// Create a weekly system analytics report notification for admins
async function createWeeklySystemReportNotifications() {
  await db.query(
    `INSERT INTO notifications
      (user_id, title, message, type, event_type)
     SELECT
       u.id,
       'Weekly System Analytics Report Ready',
       'Your weekly system analytics report is ready to review.',
       'analytics_report',
       'weekly_system_report_ready'
     FROM users u
     WHERE u.role = 'admin'
       AND u.is_active = 1
       AND NOT EXISTS (
         SELECT 1
         FROM notifications n
         WHERE n.user_id = u.id
           AND n.event_type = 'weekly_system_report_ready'
           AND YEARWEEK(n.created_at, 3) = YEARWEEK(CURDATE(), 3)
       )`
  );
}

// Get notifications for the logged-in user
exports.getMyNotifications = async (req, res) => {
  const userId = req.user.id || req.user.userId;

  if (!userId) {
    return res.status(401).json({
      message: "User information is missing. Please log in again."
    });
  }

  try {
    // Generate reminders for borrowers
    if (req.user.role === "borrower") {
      await createAutomaticNotifications(userId);
    }

    // Generate weekly reports for admins
    if (req.user.role === "admin") {
      await createWeeklyAuditNotifications();
      await createWeeklySystemReportNotifications();
    }

    // Retrieve notifications for the logged-in user
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

exports.insertNotification = insertNotification;
exports.notifyUsers = notifyUsers;
exports.notifyGSDPersonnel = notifyGSDPersonnel;
