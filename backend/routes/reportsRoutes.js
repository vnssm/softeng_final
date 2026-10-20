const express = require("express");
const router = express.Router();

const { getReports } = require("../controllers/reportsController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// Admin reports
router.get("/", protect, restrictTo("admin"), getReports);

module.exports = router;