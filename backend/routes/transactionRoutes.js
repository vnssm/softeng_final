
const express = require("express");
const router = express.Router();

const transactionController = require("../controllers/transactionController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

router.get("/", protect, transactionController.getAllTransactions);

router.delete(
  "/:id/remove",
  protect,
  restrictTo("admin"),
  transactionController.removeTransaction
);

module.exports = router;
