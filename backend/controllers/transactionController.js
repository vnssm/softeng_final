
const pool = require("../config/db");

exports.getAllTransactions = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        r.id,
        r.request_code,
        r.request_type,
        r.purpose,
        r.date_needed,
        r.time_start,
        r.time_end,
        r.fulfillment_type,
        r.status,
        r.created_at,
        r.approved_at,
        r.active_at,
        r.returned_at,
        r.completed_at,
        r.location,
        r.remarks,
        r.rejection_reason,

        u.first_name,
        u.last_name,
        u.college_department,

        GROUP_CONCAT(
          DISTINCT e.name
          ORDER BY e.name
          SEPARATOR ', '
        ) AS equipment_names,

        f.name AS facility_name,

        GROUP_CONCAT(
          DISTINCT CONCAT(p.first_name, ' ', p.last_name)
          ORDER BY p.first_name
          SEPARATOR ', '
        ) AS personnel_name

      FROM requests r

      LEFT JOIN users u
        ON r.user_id = u.id

      LEFT JOIN request_items ri
        ON r.id = ri.request_id

      LEFT JOIN equipment e
        ON ri.equipment_id = e.id

      LEFT JOIN facilities f
        ON r.facility_id = f.id

      LEFT JOIN assignments a
        ON r.id = a.request_id

      LEFT JOIN users p
        ON a.personnel_id = p.id

      GROUP BY
        r.id,
        r.request_code,
        r.request_type,
        r.purpose,
        r.date_needed,
        r.time_start,
        r.time_end,
        r.fulfillment_type,
        r.status,
        r.created_at,
        r.approved_at,
        r.active_at,
        r.returned_at,
        r.completed_at,
        r.location,
        r.remarks,
        r.rejection_reason,
        u.first_name,
        u.last_name,
        u.college_department,
        f.name

      ORDER BY r.created_at DESC
    `);

    res.status(200).json(rows);
  } catch (error) {
    console.error("Get transactions error:", error);

    res.status(500).json({
      message: "Failed to retrieve transactions"
    });
  }
};
