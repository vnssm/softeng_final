
const db = require("../config/db");

async function notifyUsersInTransaction(connection, { userIds, title, message, type = "info", eventType, requestId }) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return;
  }

  for (const userId of userIds) {
    await connection.query(
      `INSERT INTO notifications
        (user_id, title, message, type, event_type, related_request_id)
       VALUES (?, ?, ?, ?, ?, ?)` ,
      [userId, title, message, type, eventType, requestId || null]
    );
  }
}

async function notifyGSDPersonnelInTransaction(connection, { title, message, type = "info", eventType, requestId }) {
  const [personnelUsers] = await connection.query(
    `SELECT id
     FROM users
     WHERE role IN ('personnel', 'admin')
       AND is_active = 1`
  );

  await notifyUsersInTransaction(connection, {
    userIds: personnelUsers.map((personnel) => personnel.id),
    title,
    message,
    type,
    eventType,
    requestId,
  });
}

exports.getPersonnelRequests = async (req, res) => {
  try {

        // Update overdue transactions before retrieving requests
    await db.query(
      `UPDATE requests
       SET status = 'overdue'
       WHERE status IN (
         'approved',
         'for_delivery',
         'for_pickup',
         'ongoing'
       )
       AND date_end IS NOT NULL
       AND time_end IS NOT NULL
       AND TIMESTAMP(date_end, time_end) < NOW()
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.related_request_id = requests.id
           AND n.event_type = 'overdue_request'
       )`
    );

    await db.query(
      `INSERT INTO notifications
       (user_id, title, message, type, event_type, related_request_id)
       SELECT
         r.user_id,
         'Overdue Request',
         CONCAT(
           'The request ',
           r.request_code,
           ' is now overdue. Please review the current status and next action.'
         ),
         'error',
         'overdue_request',
         r.id
       FROM requests r
       WHERE r.status = 'overdue'
         AND r.user_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.user_id = r.user_id
             AND n.related_request_id = r.id
             AND n.event_type = 'overdue_request'
         )`
    );

    await db.query(
      `INSERT INTO notifications
       (user_id, title, message, type, event_type, related_request_id)
       SELECT
         u.id,
         'Overdue Request',
         CONCAT(
           'Request ',
           r.request_code,
           ' is now overdue and requires review.'
         ),
         'error',
         'overdue_request',
         r.id
       FROM requests r
       JOIN users u ON u.role IN ('personnel', 'admin')
       WHERE r.status = 'overdue'
         AND r.user_id IS NOT NULL
         AND u.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.user_id = u.id
             AND n.related_request_id = r.id
             AND n.event_type = 'overdue_request'
         )`
    );

    const [requests] = await db.query(`
      SELECT
        r.id,
        r.request_code,
        r.request_type,
        r.purpose,
        r.date_needed,
        r.date_end,
        r.time_start,
        r.time_end,
        r.location,
        r.fulfillment_type,
        r.status,
        r.return_condition,
        r.inspection_notes,
        r.returned_at,
        r.inspected_by,
        r.rejection_reason,
        r.remarks,
        u.first_name,
        u.last_name,
        f.name AS facility_name,
        GROUP_CONCAT(
          DISTINCT e.name
          ORDER BY e.name
          SEPARATOR ', '
        ) AS equipment_names,
        SUM(ri.quantity) AS quantity
      FROM requests r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN facilities f ON r.facility_id = f.id
      LEFT JOIN request_items ri ON r.id = ri.request_id
      LEFT JOIN equipment e ON ri.equipment_id = e.id
      GROUP BY
        r.id,
        r.request_code,
        r.request_type,
        r.purpose,
        r.date_needed,
        r.date_end,
        r.time_start,
        r.time_end,
        r.location,
        r.fulfillment_type,
        r.status,
        r.rejection_reason,
        r.remarks,
        r.return_condition,
        r.inspection_notes,
        r.returned_at,
        r.inspected_by,
        u.first_name,
        u.last_name,
        f.name
      ORDER BY r.id DESC
    `);

    const formattedRequests = requests.map((item) => ({
      ...item,
      requestedBy: item.first_name + " " + item.last_name,
      type:
        item.request_type === "facility"
          ? "Facility"
          : "Equipment",
      name:
        item.request_type === "facility"
          ? item.facility_name
          : item.equipment_names,
    }));

    res.status(200).json({
      requests: formattedRequests,
    });
  } catch (error) {
    console.error("Get personnel requests error:", error);

    res.status(500).json({
      message: "Failed to retrieve requests.",
    });
  }
};



exports.approveRequest = async (req, res) => {
  let connection;

  try {
    const requestId = req.params.id;
    const assignedName = req.body.assignedPersonnel;

    if (!assignedName) {
      return res.status(400).json({
        message: "Please assign personnel."
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Find the request
    const [requests] = await connection.query(
      `SELECT id, user_id, request_code, request_type, fulfillment_type,
              date_needed, time_start, location
       FROM requests
       WHERE id = ? AND status IN ('pending', 'under_review')
       FOR UPDATE`,
      [requestId]
    );

    if (requests.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        message: "Request not found or already processed."
      });
    }

    const request = requests[0];

    // Find the assigned personnel's user ID
    const [personnel] = await connection.query(
      `SELECT id
       FROM users
       WHERE TRIM(CONCAT(first_name, ' ', last_name)) = ?
         AND role = 'personnel'
         AND is_active = 1
       LIMIT 1`,
      [assignedName]
    );

    if (personnel.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        message: "Assigned personnel was not found. Check the personnel name."
      });
    }

    // Approve the request
    await connection.query(
      `UPDATE requests
       SET status = 'approved',
           approved_by = ?
       WHERE id = ?`,
      [req.user.id, requestId]
    );

    await connection.query(
      `INSERT INTO activity_logs
        (user_id, action_type, description, related_type, related_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        "request_approved",
        "Approved request " + request.request_code,
        "request",
        request.id
      ]
    );

    // Create an assignment for equipment requests
    if (request.request_type === "equipment") {
      const assignmentType =
        String(request.fulfillment_type || "").toLowerCase();

      if (
        assignmentType !== "pickup" &&
        assignmentType !== "delivery"
      ) {
        await connection.rollback();

        return res.status(400).json({
          message: "The request must have a valid pickup or delivery type."
        });
      }

      const scheduledTime =
        request.date_needed && request.time_start
          ? String(request.date_needed).slice(0, 10) +
            " " +
            request.time_start
          : null;

      await connection.query(
        `INSERT INTO assignments
          (request_id, personnel_id, assignment_type,
           title, scheduled_time, location, status)
         VALUES (?, ?, ?, ?, ?, ?, 'assigned')`,
        [
          request.id,
          personnel[0].id,
          assignmentType,
          request.request_code || "Equipment Request",
          scheduledTime,
          request.location || null
        ]
      );

      const scheduleTitle =
        assignmentType === "pickup" ? "Pickup Schedule" : "Delivery Schedule";
      const scheduleMessage =
        "Your " +
        request.request_type +
        " request " +
        request.request_code +
        " has been scheduled for " +
        (assignmentType === "pickup" ? "pickup" : "delivery") +
        " on " +
        (request.date_needed || "the scheduled date") +
        ".";

      await connection.query(
        `INSERT INTO notifications
          (user_id, title, message, type, event_type, related_request_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          request.user_id,
          scheduleTitle,
          scheduleMessage,
          "warning",
          "request_schedule",
          request.id
        ]
      );

      await notifyUsersInTransaction(connection, {
        userIds: [personnel[0].id],
        title: scheduleTitle,
        message: `You have been assigned to ${assignmentType} request ${request.request_code}. Please prepare the ${assignmentType} schedule and confirm the details.`,
        type: "info",
        eventType: "assignment_assigned",
        requestId: request.id,
      });
    }

    // Create an approval notification for the borrower
    await connection.query(
      `INSERT INTO notifications
        (user_id, title, message, type, event_type, related_request_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        request.user_id,
        "Request Approved",
        "Your request " + request.request_code +
          " has been approved by GSD personnel.",
        "warning",
        "request_approved",
        request.id
      ]
    );

    await notifyGSDPersonnelInTransaction(connection, {
      title: "Request Approved",
      message: `Request ${request.request_code} has been approved and assigned to GSD personnel for processing.`,
      type: "success",
      eventType: "request_approved",
      requestId: request.id,
    });

    await connection.commit();

    res.status(200).json({
      message: "Request approved, personnel assigned, and borrower notified."
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Approve request error:", error);

    res.status(500).json({
      message: "Failed to approve request."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};



exports.rejectRequest = async (req, res) => {
  let connection;

  try {
    const requestId = req.params.id;
    const rejectionReason = (req.body.rejection_reason || "").trim();

    if (!rejectionReason) {
      return res.status(400).json({
        message: "Please provide a reason for rejection."
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Find the pending request and its borrower
    const [requests] = await connection.query(
      `SELECT id, user_id, request_code
       FROM requests
       WHERE id = ? AND status IN ('pending', 'under_review')
       FOR UPDATE`,
      [requestId]
    );

    if (requests.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        message: "Request not found or already processed."
      });
    }

    const request = requests[0];

    // Update the request status
    await connection.query(
      `UPDATE requests
       SET status = 'rejected',
           rejection_reason = ?
       WHERE id = ?`,
      [rejectionReason, requestId]
    );

    await connection.query(
      `INSERT INTO activity_logs
        (user_id, action_type, description, related_type, related_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        "request_rejected",
        "Rejected request " + request.request_code,
        "request",
        request.id
      ]
    );

    // Notify the borrower
    await connection.query(
      `INSERT INTO notifications
        (user_id, title, message, type, event_type, related_request_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        request.user_id,
        "Request Rejected",
        "Your request " + request.request_code +
          " has been rejected. Reason: " + rejectionReason,
        "error",
        "request_rejected",
        request.id
      ]
    );

    await notifyGSDPersonnelInTransaction(connection, {
      title: "Request Rejected",
      message: `Request ${request.request_code} was rejected. Reason: ${rejectionReason}`,
      type: "error",
      eventType: "request_rejected",
      requestId: request.id,
    });

    await connection.commit();

    return res.status(200).json({
      message: "Request rejected and borrower notified."
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Reject request error:", error);

    return res.status(500).json({
      message: "Failed to reject request."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};


exports.inspectReturn = async (req, res) => {
  let connection;

  try {
    const requestId = req.params.id;
    const returnCondition = (req.body.return_condition || "").trim();
    const inspectionNotes = (req.body.inspection_notes || "").trim();

    if (!returnCondition) {
      return res.status(400).json({
        message: "Please select the condition of the returned item."
      });
    }

    const allowedConditions = [
      "Normal",
      "With minor defect",
      "With major defect",
      "In minor disarray",
      "Neglected"
    ];

    if (!allowedConditions.includes(returnCondition)) {
      return res.status(400).json({
        message: "Invalid return condition."
      });
    }

    // A damage or issue description is required.
    if (returnCondition !== "Normal" && !inspectionNotes) {
      return res.status(400).json({
        message: "Please describe the damage or issue found."
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Only inspect requests that have already been returned.
    const [requests] = await connection.query(
      `SELECT id, user_id, request_code, request_type
       FROM requests
       WHERE id = ? AND status = 'returned'
       FOR UPDATE`,
      [requestId]
    );

    if (requests.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        message: "This request is not awaiting return inspection."
      });
    }

    const request = requests[0];

    let newStatus = "completed";

    if (returnCondition !== "Normal") {
      newStatus = "completed_with_issue";
    }

    // Save the inspection and update the request status.
    await connection.query(
      `UPDATE requests
       SET status = ?,
           return_condition = ?,
           inspection_notes = ?,
           returned_at = NOW(),
           inspected_by = ?
       WHERE id = ?`,
      [
        newStatus,
        returnCondition,
        inspectionNotes || null,
        req.user.id,
        requestId
      ]
    );

    await connection.query(
      `INSERT INTO activity_logs
        (user_id, action_type, description, related_type, related_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        "return_inspected",
        "Inspected the return for request " + request.request_code,
        "request",
        request.id
      ]
    );

    // Notify the borrower when damage or issues are found.
    if (newStatus === "completed_with_issue") {
      const message =
        "The return inspection for request " +
        request.request_code +
        " identified the following condition: " +
        returnCondition +
        ". Inspection report: " +
        inspectionNotes;

      await connection.query(
        `INSERT INTO notifications
          (user_id, title, message, type, event_type, related_request_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          request.user_id,
          "Return Inspection Report",
          message,
          "warning",
          "return_issue_report",
          request.id
        ]
      );

      await notifyGSDPersonnelInTransaction(connection, {
        title: "Return Issue Reported",
        message: `Request ${request.request_code} was returned with a defect or issue: ${returnCondition}.`,
        type: "error",
        eventType: "return_issue_report",
        requestId: request.id,
      });
    }

    await connection.commit();

    return res.status(200).json({
      message:
        newStatus === "completed"
          ? "Return inspection completed successfully."
          : "Issue report saved and borrower notified.",
      status: newStatus,
      return_condition: returnCondition,
      inspection_notes: inspectionNotes
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Return inspection error:", error);

    return res.status(500).json({
      message: "Failed to save return inspection."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};


