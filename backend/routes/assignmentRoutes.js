
const express = require("express");
const router = express.Router();

const {
  getMyAssignments
} = require("../controllers/assignmentController");

const {
  protect,
  restrictTo
} = require("../middleware/authMiddleware");

// Get assignments for the logged-in personnel
router.get(
  "/my-assignments",
  protect,
  restrictTo("personnel"),
  getMyAssignments
);

module.exports = router;
