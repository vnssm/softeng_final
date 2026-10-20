
const express = require("express");
const router = express.Router();

const {
  getMyNotifications,
  markAsRead
} = require("../controllers/notificationController");

const {
  protect,
  restrictTo
} = require("../middleware/authMiddleware");

// Allow borrowers, personnel, and admins to view notifications
router.get(
  "/my-notifications",
  protect,
  restrictTo("borrower", "personnel", "admin"),
  getMyNotifications
);

// Allow borrowers, personnel, and admins to mark notifications as read
router.patch(
  "/:id/read",
  protect,
  restrictTo("borrower", "personnel", "admin"),
  markAsRead
);

module.exports = router;
