const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { protect, restrictTo, } = require("../middleware/authMiddleware");

// Only logged-in users can access
router.get("/borrower", protect, dashboardController.getBorrowerDashboard);
router.get("/personnel", protect, restrictTo("personnel", "admin"), dashboardController.getPersonnelDashboard);
router.get("/admin", protect , restrictTo("admin"), dashboardController.getAdminDashboard);

module.exports = router;