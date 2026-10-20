
const pool = require("../config/db");

const saveAuditLog = async (req, action, tableName, recordId, oldValues, newValues) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs
        (user_id, action, table_name, record_id, old_values, new_values, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user?.id || null,
        action,
        tableName,
        recordId || null,
        oldValues == null ? null : JSON.stringify(oldValues),
        newValues == null ? null : JSON.stringify(newValues),
        req.ip || null,
      ]
    );
  } catch (error) {
    // Do not interrupt the main operation if audit logging fails.
    console.error("Audit log error:", error.message);
  }
};

module.exports = saveAuditLog;
