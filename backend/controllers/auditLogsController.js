
const pool = require("../config/db");

exports.getAuditLogs = async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT
          a.id,
          a.user_id,
          a.action,
          a.table_name,
          a.record_id,
          a.ip_address,
          a.created_at,
          u.first_name,
          u.last_name,
          u.role
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC`
    );

    const auditLogs = logs.map((log) => {
      let displayRole = log.role || "Unknown";

      if (displayRole === "personnel") {
        displayRole = "GSD Staff";
      } else if (displayRole === "admin") {
        displayRole = "Administrator";
      } else if (displayRole === "borrower") {
        displayRole = "Borrower";
      }

      return {
        id: log.id,
        timestamp: log.created_at,
        user: log.first_name
          ? `${log.first_name} ${log.last_name}`
          : "Unknown User",
        role: displayRole,
        action: log.action,
        targetModule: log.table_name || "System",
        recordId: log.record_id,
        ipAddress: log.ip_address,
      };
    });

    res.json(auditLogs);
  } catch (error) {
    console.error("Get audit logs error:", error);

    res.status(500).json({
      message: "Failed to retrieve audit logs.",
    });
  }
};
