
const pool = require("../config/db");
const saveAuditLog = require("../utils/auditLogger");
const { notifyAdmins } = require("../utils/notificationHelper");

// Record the logged-in user's transaction activity
const logTransactionActivity = async (
  req,
  actionType,
  description,
  transactionId
) => {
  try {
    const userId = req.user.id || req.user.userId;

    await pool.query(
      `INSERT INTO activity_logs
       (user_id, action_type, description, related_type, related_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        actionType,
        description,
        "request",
        transactionId
      ]
    );
  } catch (error) {
    console.error("Transaction activity log error:", error.message);
  }
};

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

        WHERE NOT EXISTS (
          SELECT 1
          FROM transaction_removals tr
          WHERE tr.request_id = r.id
        )

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


exports.removeTransaction = async (req, res) => {
  try {
    const id = req.params.id;

    // Find the transaction before removing it from the list
    const [rows] = await pool.query(
      `SELECT
         r.id,
         r.request_code,
         r.request_type,
         r.status,
         u.first_name,
         u.last_name
       FROM requests r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Transaction not found."
      });
    }

    // Check whether this transaction was already removed
    const [removedRows] = await pool.query(
      `SELECT id
       FROM transaction_removals
       WHERE request_id = ?`,
      [id]
    );

    if (removedRows.length > 0) {
      return res.status(409).json({
        message: "This transaction has already been removed."
      });
    }

    // Hide the transaction without deleting its original record
    await pool.query(
      `INSERT INTO transaction_removals
       (request_id, removed_by)
       VALUES (?, ?)`,
      [id, req.user.id]
    );

    await logTransactionActivity(
      req,
      "transaction_removed",
      "Removed transaction " +
        (rows[0].request_code || ("TX-" + id)),
      id
    );

    // Record the action in the audit log
    try {
      await saveAuditLog(
        req,
        "Transaction Removed",
        "requests",
        id,
        rows[0],
        {
          ...rows[0],
          removed_from_transaction_list: true
        }
      );
    } catch (auditError) {
      console.error("Transaction removal audit error:", auditError);
    }

    // Notify active administrator accounts
    await notifyAdmins(
      "Transaction Removed",
      "Transaction " +
        (rows[0].request_code || ("TX-" + id)) +
        " was removed from the transaction list.",
      "transaction",
      "transaction_removed"
    );

    return res.status(200).json({
      message: "Transaction removed from the list successfully."
    });
  } catch (error) {
    console.error("Remove transaction error:", error);

    return res.status(500).json({
      message: "Failed to remove transaction."
    });
  }
};