const pool = require("../config/db");

// Get assignments belonging to the logged-in personnel
exports.getMyAssignments = async (req, res) => {
  try {
    const personnelId = req.user?.id || req.user?.userId;

    if (!personnelId) {
      return res.status(401).json({
        message: "Personnel information is missing. Please log in again.",
      });
    }

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

        f.name AS facility_name,

        (
          SELECT GROUP_CONCAT(
            DISTINCT e.name
            ORDER BY e.name
            SEPARATOR ', '
          )
          FROM request_items ri
          JOIN equipment e ON e.id = ri.equipment_id
          WHERE ri.request_id = r.id
        ) AS equipment_names,

        CONCAT(u.first_name, ' ', u.last_name) AS borrower_name

      FROM assignments a
      JOIN requests r ON a.request_id = r.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN facilities f ON r.facility_id = f.id

      WHERE a.personnel_id = ?

        AND NOT EXISTS (
          SELECT 1
          FROM transaction_removals tr
          WHERE tr.request_id = r.id
        )

      ORDER BY r.created_at DESC`,
      [personnelId]
    );

    return res.status(200).json({ assignments });

  } catch (error) {
    console.error("Get assignments error:", error);

    return res.status(500).json({
      message: "Failed to load assignments.",
    });
  }
};