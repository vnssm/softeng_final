
const db = require("../config/db");

// Create a new facility reservation
exports.createReservation = async (req, res) => {
  const userId = req.user.id || req.user.userId;

  const {
    facilityId,
    startDate,
    endDate,
    startTime,
    endTime,
    purpose
  } = req.body;

  if (!userId) {
    return res.status(401).json({
      message: "User information is missing. Please log in again."
    });
  }

  if (
    !facilityId ||
    !startDate ||
    !endDate ||
    !startTime ||
    !endTime ||
    !purpose ||
    !purpose.trim()
  ) {
    return res.status(400).json({
      message: "Please complete all required fields."
    });
  }

  if (!Number.isInteger(Number(facilityId)) || Number(facilityId) < 1) {
    return res.status(400).json({
      message: "Invalid facility selected."
    });
  }

  if (endDate < startDate) {
    return res.status(400).json({
      message: "End date cannot be earlier than start date."
    });
  }

  if (
    startDate === endDate &&
    endTime <= startTime
  ) {
    return res.status(400).json({
      message: "End time must be later than start time."
    });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check whether the facility exists and is available
    const [facilityRows] = await connection.query(
      `SELECT id, name, location
       FROM facilities
       WHERE id = ?
         AND is_active = TRUE
         AND is_available = TRUE
       FOR UPDATE`,
      [facilityId]
    );

    if (facilityRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Facility was not found or is unavailable."
      });
    }

    const facility = facilityRows[0];

    // Check for overlapping facility reservations
    const [conflictingRows] = await connection.query(
      `SELECT id
       FROM requests
       WHERE facility_id = ?
         AND request_type = 'facility'
         AND status IN ('pending', 'approved', 'ongoing')
         AND TIMESTAMP(date_needed, time_start)
             < TIMESTAMP(?, ?)
         AND TIMESTAMP(date_end, time_end)
             > TIMESTAMP(?, ?)
       LIMIT 1`,
      [
        facilityId,
        endDate,
        endTime,
        startDate,
        startTime
      ]
    );

    if (conflictingRows.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        message: "This facility already has a reservation during the selected time."
      });
    }

    // Generate a reservation request code
    const requestCode =
      "FR-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    // Save the reservation in the requests table
    const [requestResult] = await connection.query(
      `INSERT INTO requests
       (
         request_code,
         user_id,
         request_type,
         facility_id,
         purpose,
         date_needed,
         date_end,
         time_start,
         time_end,
         location,
         status
       )
       VALUES (?, ?, 'facility', ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        requestCode,
        userId,
        facilityId,
        purpose.trim(),
        startDate,
        endDate,
        startTime,
        endTime,
        facility.location
      ]
    );

    await connection.query(
      `INSERT INTO activity_logs
       (user_id, action_type, description, related_type, related_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        "facility_reservation",
        "Submitted a facility reservation for " + facility.name,
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
        "Facility Reservation Submitted",
        "Your reservation for " +
        facility.name +
        " has been submitted successfully and is awaiting approval.",
        "success",
        "request_submitted",
        requestResult.insertId
    ]
    );

    // Notify GSD personnel about the new facility reservation
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
          "New Facility Reservation",
          "A borrower has submitted a reservation for " +
            facility.name +
            ". Please review the reservation.",
          "info",
          "new_request",
          requestResult.insertId
        ]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: "Facility reservation submitted successfully.",
      request: {
        id: requestResult.insertId,
        request_code: requestCode,
        facility_name: facility.name,
        status: "pending"
      }
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Create facility reservation error:", error);

    return res.status(500).json({
      message: "Failed to submit facility reservation."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Get the logged-in borrower's facility reservations
exports.getMyReservations = async (req, res) => {
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
         r.status,
         r.created_at,
         f.id AS facility_id,
         f.name AS facility_name
       FROM requests r
       INNER JOIN facilities f ON r.facility_id = f.id
       WHERE r.user_id = ?
         AND r.request_type = 'facility'
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      reservations: rows
    });
  } catch (error) {
    console.error("Get facility reservations error:", error);

    return res.status(500).json({
      message: "Failed to load facility reservations."
    });
  }
};


exports.returnReservation = async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const requestId = req.params.id;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, request_code, status
       FROM requests
       WHERE id = ?
         AND user_id = ?
         AND request_type = 'facility'
       FOR UPDATE`,
      [requestId, userId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "Facility reservation not found."
      });
    }

    const request = rows[0];

    if (!["approved", "overdue"].includes(request.status)) {
      await connection.rollback();
      return res.status(400).json({
        message: "Only approved or overdue reservations can be marked as returned."
      });
    }

    await connection.query(
      `UPDATE requests
       SET status = 'returned'
       WHERE id = ? AND user_id = ?`,
      [requestId, userId]
    );

    await connection.query(
      `INSERT INTO activity_logs
       (user_id, action_type, description, related_type, related_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        "facility_return",
        "Marked facility reservation " + request.request_code + " as returned",
        "request",
        requestId
      ]
    );

    await connection.query(
      `INSERT INTO notifications
       (user_id, title, message, type, event_type, related_request_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        "Reservation Return Submitted",
        "Your facility reservation " + request.request_code +
          " has been marked as returned and is awaiting inspection by GSD personnel.",
        "success",
        "request_returned",
        requestId
      ]
    );

    await connection.commit();

    return res.status(200).json({
      message: "Facility reservation marked as returned successfully.",
      status: "returned"
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Return facility reservation error:", error);

    return res.status(500).json({
      message: "Failed to mark reservation as returned."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
