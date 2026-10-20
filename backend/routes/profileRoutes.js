
const express = require("express");
const router = express.Router();

const {
  getMyProfile,
  updateMyProfile,
  uploadProfilePicture
} = require("../controllers/profileController");

const {
  protect,
  restrictTo
} = require("../middleware/authMiddleware");

// Roles allowed to access their own profile
router.get(
  "/me",
  protect,
  restrictTo("borrower", "personnel", "admin"),
  getMyProfile
);

// Update profile details
router.put(
  "/me",
  protect,
  restrictTo("borrower", "personnel", "admin"),
  updateMyProfile
);

// Upload profile picture
router.put(
  "/picture",
  protect,
  restrictTo("borrower", "personnel", "admin"),
  uploadProfilePicture
);

module.exports = router;
