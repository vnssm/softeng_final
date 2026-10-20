
const express = require("express");
const router = express.Router();

const {
  createBorrowing,
  getMyBorrowings,
  returnBorrowing
} = require("../controllers/borrowingController");

const {
  protect,
  restrictTo
} = require("../middleware/authMiddleware");

// Submit an equipment borrowing request
router.post(
  "/",
  protect,
  restrictTo("borrower"),
  createBorrowing
);

// Get the logged-in borrower's equipment requests
router.get(
  "/my-requests",
  protect,
  restrictTo("borrower"),
  getMyBorrowings
);

// Mark an approved equipment request as returned
router.post(
  "/my-requests/:id/return",
  protect,
  restrictTo("borrower"),
  returnBorrowing
);

module.exports = router;
