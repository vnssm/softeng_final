const express = require("express");
const router = express.Router();
const facilityController = require("../controllers/facilityController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, facilityController.getAllFacilities);
router.get("/:id", protect, facilityController.getFacilityById);
router.post("/", protect, facilityController.createFacility);
router.put("/:id", protect, facilityController.updateFacility);

module.exports = router;