const pool = require("../config/db");

// Get all transactions for the GSD personnel page
exports.getMyAssignments = async (req, res) => {
  try {
    const [assignments] = await pool.query(
      `SELECT
        a.id,
        a.request_id,
        a.personnel_id,
        a.assignment_type,
        a.title,
        a.scheduled_time,
        a.location AS assignment_location,
        a.status AS assignment_status,
        a.notes,
        a.completed_at,

        r.id AS transaction_id,
        r.request_code,
        r.request_type,
        r.status AS transaction_status,
        r.fulfillment_type,
        r.purpose,
        r.location,
        r.date_needed,
        r.time_start,
        r.time_end,

        CONCAT(u.first_name, ' ', u.last_name) AS borrower_name

      FROM requests r
      LEFT JOIN assignments a ON a.request_id = r.id
      LEFT JOIN users u ON r.user_id = u.id

      WHERE r.status IN ('pending', 'approved', 'overdue')
         OR a.id IS NOT NULL

      ORDER BY r.created_at DESC`
    );

    return res.status(200).json({ assignments });
  } catch (error) {
    console.error("Get assignments error:", error);

    return res.status(500).json({
      message: "Failed to load assignments.",
    });
  }
};