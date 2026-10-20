
const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// All routes below require an administrator
router.use(protect, restrictTo("admin"));

router.get("/", userController.getAllUsers);
router.post("/", userController.createUser);
router.put("/:id", userController.updateUser);
router.patch("/:id/deactivate", userController.deactivateUser);

module.exports = router;
