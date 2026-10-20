
const express = require("express");
const router = express.Router();

const {
  getMyActivities
} = require("../controllers/activityController");

const {
  protect,
  restrictTo
} = require("../middleware/authMiddleware");

// Get the logged-in borrower's activity history
router.get(
  "/my-activities",
  protect,
  restrictTo("borrower"),
  getMyActivities
);

module.exports = router;
