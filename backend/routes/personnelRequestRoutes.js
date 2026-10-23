
const express = require("express");
const router = express.Router();

const {
  getPersonnelRequests,
  getActivePersonnel,
  approveRequest,
  rejectRequest,
  inspectReturn,
} = require("../controllers/personnelRequestController");

const {
  protect,
  restrictTo,
} = require("../middleware/authMiddleware");

// Get all requests for personnel and admin
router.get(
  "/requests",
  protect,
  restrictTo("personnel", "admin"),
  getPersonnelRequests
);

router.get(
  "/active-personnel",
  protect,
  restrictTo("personnel", "admin"),
  getActivePersonnel
);

// Approve a request
router.post(
  "/requests/:id/approve",
  protect,
  restrictTo("personnel", "admin"),
  approveRequest
);

// Reject a request
router.post(
  "/requests/:id/reject",
  protect,
  restrictTo("personnel", "admin"),
  rejectRequest
);

// Inspect returned equipment or facility
router.post(
  "/requests/:id/inspect-return",
  protect,
  restrictTo("personnel", "admin"),
  inspectReturn
);

module.exports = router;
