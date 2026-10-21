
const express = require("express");
const router = express.Router();

const {
  getMyActivities
} = require("../controllers/activityController");

const {
  protect,
  restrictTo
} = require("../middleware/authMiddleware");

// Get the logged-in user's activity history
router.get(
  "/my-activities",
  protect,
  restrictTo("borrower", "personnel", "admin"),
  getMyActivities
);

module.exports = router;
