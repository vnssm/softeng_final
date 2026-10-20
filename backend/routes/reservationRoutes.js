
const express = require("express");
const router = express.Router();

const {
  createReservation,
  getMyReservations,
  returnReservation
} = require("../controllers/reservationController");

const {
  protect,
  restrictTo
} = require("../middleware/authMiddleware");

// Submit a facility reservation
router.post(
  "/",
  protect,
  restrictTo("borrower"),
  createReservation
);

// Get the logged-in borrower's facility reservations
router.get(
  "/my-reservations",
  protect,
  restrictTo("borrower"),
  getMyReservations
);

// Mark an approved facility reservation as returned
router.post(
  "/my-reservations/:id/return",
  protect,
  restrictTo("borrower"),
  returnReservation
);

module.exports = router;
