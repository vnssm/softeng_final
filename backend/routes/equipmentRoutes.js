const express = require("express");
const router = express.Router();
const equipmentController = require("../controllers/equipmentController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, equipmentController.getAllEquipment);
router.get("/:id", protect, equipmentController.getEquipmentById);
router.post("/", protect, equipmentController.createEquipment);
router.put("/:id", protect, equipmentController.updateEquipment);

module.exports = router;