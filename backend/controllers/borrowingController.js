
const db = require("../config/db");

const { logActivity } = require("./activityController");

// Create a new equipment borrowing request
exports.createBorrowing = async (req, res) => {
  const userId = req.user.id || req.user.userId;

  const {
    equipmentId,
    quantity,
    startDate,
    endDate,
    startTime,
    endTime,
    purpose,
    location,
    fulfillmentType
  } = req.body;

  if (!userId) {
    return res.status(401).json({
      message: "User information is missing. Please log in again."
    });
  }

  if (
    !equipmentId ||
    !startDate ||
    !endDate ||
    !startTime ||
    !endTime ||
    !purpose ||
    !quantity
  ) {
    return res.status(400).json({
      message: "Please complete all required fields."
    });
  }

  if (
    !Number.isInteger(Number(quantity)) ||
    Number(quantity) < 1
  ) {
    return res.status(400).json({
      message: "Quantity must be at least 1."
    });
  }

  if (endDate < startDate) {
    return res.status(400).json({
      message: "End date cannot be earlier than start date."
    });
  }

  if (startDate === endDate && endTime <= startTime) {
    return res.status(400).json({
      message: "End time must be later than start time."
    });
  }

  if (!["pickup", "delivery"].includes(fulfillmentType)) {
    return res.status(400).json({
      message: "Please select pickup or delivery."
    });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check if the requested equipment exists and is active
    const [equipmentRows] = await connection.query(
      `SELECT id, name, quantity_available
       FROM equipment
       WHERE id = ? AND is_active = TRUE
       FOR UPDATE`,
      [equipmentId]
    );

    if (equipmentRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Equipment was not found or is inactive."
      });
    }

    const equipment = equipmentRows[0];

    if (Number(quantity) > equipment.quantity_available) {
      await connection.rollback();

      return res.status(400).json({
        message: "The requested quantity exceeds the currently available quantity."
      });
    }

    // Generate a unique request code
    const requestCode =
      "BR-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    // Save the main request
    const [requestResult] = await connection.query(
      `INSERT INTO requests
       (
         request_code,
         user_id,
         request_type,
         purpose,
         date_needed,
         date_end,
         time_start,
         time_end,
         location,
         fulfillment_type,
         status
       )
       VALUES (?, ?, 'equipment', ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        requestCode,
        userId,
        purpose,
        startDate,
        endDate,
        startTime,
        endTime,
        location || null,
        fulfillmentType
      ]
    );

    // Save the requested equipment
    await connection.query(
      `INSERT INTO request_items
       (request_id, equipment_id, quantity)
       VALUES (?, ?, ?)`,
      [requestResult.insertId, equipmentId, Number(quantity)]
    );

    await connection.query(
      `INSERT INTO activity_logs
      (user_id, action_type, description, related_type, related_id)
      VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        "equipment_request",
        "Submitted an equipment borrowing request for " + equipment.name,
        "request",
        requestResult.insertId
      ]
    );

    // Create a notification for the borrower
    await connection.query(
      `INSERT INTO notifications
      (user_id, title, message, type, event_type, related_request_id)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        "Borrowing Request Submitted",
        "Your borrowing request for " +
          equipment.name +
          " has been submitted successfully and is awaiting approval.",
        "success",
        "request_submitted",
        requestResult.insertId
      ]
    );

    // Notify GSD personnel about the new equipment request
    const [personnelUsers] = await connection.query(
      `SELECT id
      FROM users
      WHERE role IN ('personnel', 'admin')
        AND is_active = TRUE`
    );

    for (const personnel of personnelUsers) {
      await connection.query(
        `INSERT INTO notifications
        (user_id, title, message, type, event_type, related_request_id)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          personnel.id,
          "New Equipment Request",
          "A borrower has submitted a request for " +
            equipment.name +
            ". Please review the request.",
          "info",
          "new_request",
          requestResult.insertId
        ]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: "Borrowing request submitted successfully.",
      request: {
        id: requestResult.insertId,
        request_code: requestCode,
        equipment_name: equipment.name,
        status: "pending"
      }
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Create borrowing error:", error.message);
    console.error("SQL Error Code:", error.code);
    console.error("SQL Error Message:", error.sqlMessage);

    return res.status(500).json({
      message: "Failed to submit borrowing request."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};


// Get borrowing requests for the logged-in borrower
exports.getMyBorrowings = async (req, res) => {
  const userId = req.user.id || req.user.userId;

  if (!userId) {
    return res.status(401).json({
      message: "User information is missing. Please log in again."
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT
         r.id,
         r.request_code,
         r.purpose,
         r.date_needed,
         r.date_end,
         r.time_start,
         r.time_end,
         r.location,
         r.fulfillment_type,
         r.status,
         r.created_at,
         e.id AS equipment_id,
         e.name AS equipment_name,
         ri.quantity
       FROM requests r
       INNER JOIN request_items ri ON r.id = ri.request_id
       INNER JOIN equipment e ON ri.equipment_id = e.id
       WHERE r.user_id = ?
         AND r.request_type = 'equipment'
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      requests: rows
    });
  } catch (error) {
    console.error("Get borrowing requests error:", error);

    return res.status(500).json({
      message: "Failed to load borrowing requests."
    });
  }
};


exports.returnBorrowing = async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const requestId = req.params.id;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Find the request owned by this borrower
    const [rows] = await connection.query(
      `SELECT id, request_code, status
       FROM requests
       WHERE id = ?
         AND user_id = ?
         AND request_type = 'equipment'
       FOR UPDATE`,
      [requestId, userId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "Equipment request not found."
      });
    }

    const request = rows[0];

    if (!["approved", "overdue"].includes(request.status)) {
      await connection.rollback();
      return res.status(400).json({
        message: "Only approved or overdue requests can be marked as returned."
      });
    }

    await connection.query(
      `UPDATE requests
       SET status = 'returned'
       WHERE id = ? AND user_id = ?`,
      [requestId, userId]
    );

    await connection.query(
      `INSERT INTO notifications
       (user_id, title, message, type, event_type, related_request_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        "Return Submitted",
        "Your equipment request " + request.request_code +
          " has been marked as returned and is awaiting inspection by GSD personnel.",
        "success",
        "request_returned",
        requestId
      ]
    );

    await connection.commit();

    return res.status(200).json({
      message: "Equipment marked as returned successfully.",
      status: "returned"
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Return equipment error:", error);

    return res.status(500).json({
      message: "Failed to mark equipment as returned."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
