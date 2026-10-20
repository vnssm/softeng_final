const express = require("express");
const router = express.Router();

const {
  getAuditLogs,
} = require("../controllers/auditLogsController");

const {
  protect,
  restrictTo,
} = require("../middleware/authMiddleware");

router.get("/", protect, restrictTo("admin"), getAuditLogs);

module.exports = router;