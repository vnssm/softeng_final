
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pool = require("../config/db");
const saveAuditLog = require("../utils/auditLogger");

const facilityUploadPath = path.join(__dirname, "../uploads/facilities");

if (!fs.existsSync(facilityUploadPath)) {
  fs.mkdirSync(facilityUploadPath, { recursive: true });
}

const facilityStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, facilityUploadPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = req.user?.id || req.user?.userId || "facility";
    cb(null, `facility_${name}_${Date.now()}${ext}`);
  },
});

const facilityUpload = multer({
  storage: facilityStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Only image files are allowed."));
  },
});

// GET ALL FACILITIES
exports.getAllFacilities = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, description, capacity, location, image_url,
              is_available, is_active
       FROM facilities
       ORDER BY name ASC`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("Get facilities error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET SINGLE FACILITY
exports.getFacilityById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM facilities WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Facility not found",
      });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Get facility error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE FACILITY
exports.createFacility = [
  facilityUpload.single("image"),
  async (req, res) => {
    try {
      const {
        name,
        description,
        capacity,
        location,
        is_available = 1,
      } = req.body;

      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Facility name is required",
        });
      }

      if (name.trim().length > 100) {
        return res.status(400).json({
          message: "Facility name must be 100 characters or fewer",
        });
      }

      if (
        capacity !== undefined &&
        capacity !== null &&
        capacity !== "" &&
        (!Number.isInteger(Number(capacity)) || Number(capacity) < 1)
      ) {
        return res.status(400).json({
          message: "Capacity must be a positive whole number",
        });
      }

      const imageUrl = req.file ? `/uploads/facilities/${req.file.filename}` : null;

      const [result] = await pool.query(
        `INSERT INTO facilities
          (name, description, capacity, location, image_url, is_available, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
          name.trim(),
          description || null,
          capacity === "" || capacity == null ? null : Number(capacity),
          location || null,
          imageUrl,
          Number(is_available) === 1 ? 1 : 0,
        ]
      );

      const [newRows] = await pool.query(
        "SELECT * FROM facilities WHERE id = ?",
        [result.insertId]
      );

      await saveAuditLog(
        req,
        "Facility Created",
        "facilities",
        result.insertId,
        null,
        newRows[0] || {
          name,
          description,
          capacity,
          location,
          image_url: imageUrl,
          is_available,
          is_active: 1,
        }
      );

      res.status(201).json({
        message: "Facility added successfully",
        id: result.insertId,
        image_url: imageUrl,
      });
    } catch (error) {
      console.error("Create facility error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
];

// UPDATE FACILITY
exports.updateFacility = [
  facilityUpload.single("image"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        name,
        description,
        capacity,
        location,
        is_available,
        is_active,
      } = req.body;

      if (
        name !== undefined &&
        (typeof name !== "string" || !name.trim())
      ) {
        return res.status(400).json({
          message: "Facility name is required",
        });
      }

      if (typeof name === "string" && name.trim().length > 100) {
        return res.status(400).json({
          message: "Facility name must be 100 characters or fewer",
        });
      }

      if (
        capacity !== undefined &&
        capacity !== null &&
        capacity !== "" &&
        (!Number.isInteger(Number(capacity)) || Number(capacity) < 1)
      ) {
        return res.status(400).json({
          message: "Capacity must be a positive whole number",
        });
      }

      const [existingRows] = await pool.query(
        "SELECT * FROM facilities WHERE id = ?",
        [id]
      );

      if (existingRows.length === 0) {
        return res.status(404).json({
          message: "Facility not found",
        });
      }

      const oldValues = existingRows[0];
      const imageUrl = req.file
        ? `/uploads/facilities/${req.file.filename}`
        : oldValues.image_url || null;

      await pool.query(
        `UPDATE facilities SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          capacity = COALESCE(?, capacity),
          location = COALESCE(?, location),
          image_url = ?,
          is_available = COALESCE(?, is_available),
          is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [
          name === undefined ? null : name.trim(),
          description ?? null,
          capacity === "" ? null : capacity ?? null,
          location ?? null,
          imageUrl,
          is_available === undefined
            ? null
            : Number(is_available) === 1
            ? 1
            : 0,
          is_active === undefined
            ? null
            : Number(is_active) === 1
            ? 1
            : 0,
          id,
        ]
      );

      const [updatedRows] = await pool.query(
        "SELECT * FROM facilities WHERE id = ?",
        [id]
      );

      const newValues = updatedRows[0];

      let action = "Facility Updated";

      if (
        Number(oldValues.is_active) === 1 &&
        Number(newValues.is_active) === 0
      ) {
        action = "Facility Deactivated";
      } else if (
        Number(oldValues.is_available) !== Number(newValues.is_available)
      ) {
        action = "Facility Availability Changed";
      }

      await saveAuditLog(
        req,
        action,
        "facilities",
        id,
        oldValues,
        newValues
      );

      res.status(200).json({
        message: "Facility updated successfully",
        image_url: imageUrl,
      });
    } catch (error) {
      console.error("Update facility error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
];
