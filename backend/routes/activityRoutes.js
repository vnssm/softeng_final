
const express = require("express");
const router = express.Router();

const {
  getMyActivities,
  getAllActivities,
  recordExportActivity
} = require("../controllers/activityController");

const {
  protect,
  restrictTo
} = require("../middleware/authMiddleware");

// Get the logged-in user's own activity history
router.get(
  "/my-activities",
  protect,
  restrictTo("borrower", "personnel", "admin"),
  getMyActivities
);

// Record an export action (admin only)
router.post(
  "/record-export",
  protect,
  restrictTo("admin"),
  recordExportActivity
);

// Get all system activities (admin only)
router.get(
  "/all",
  protect,
  restrictTo("admin"),
  getAllActivities
);

module.exports = router;
