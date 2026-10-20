
const express = require("express");
const router = express.Router();

const systemSettingsController = require("../controllers/systemSettingsController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// Only administrators can view or change system settings
router.get(
  "/",
  protect,
  restrictTo("admin"),
  systemSettingsController.getSettings
);

router.put(
  "/",
  protect,
  restrictTo("admin"),
  systemSettingsController.updateSettings
);

module.exports = router;
