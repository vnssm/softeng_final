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

const facilityStatuses = ["Available", "Unavailable", "Under maintenance"];

const respondToFacilityError = (error, res, operation) => {
  console.error(`${operation} error:`, error);

  if (
    error.code === "ER_BAD_FIELD_ERROR" &&
    /condition_status/i.test(error.sqlMessage || "")
  ) {
    return res.status(503).json({
      message:
        "Facility condition support is not installed in the database. Apply backend/migrations/20261021_add_facility_condition_status.sql, then try again.",
    });
  }

  return res.status(500).json({ message: "Server error" });
};

exports.getAllFacilities = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, description, capacity, location, image_url,
              is_available, condition_status, is_active
       FROM facilities
       ORDER BY name ASC`
    );

    res.status(200).json(rows);
  } catch (error) {
    respondToFacilityError(error, res, "Get facilities");
  }
};

exports.getFacilityById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM facilities WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Facility not found" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    respondToFacilityError(error, res, "Get facility");
  }
};

exports.createFacility = [
  facilityUpload.single("image"),
  async (req, res) => {
    try {
      const body = req.body || {};
      const { description, capacity, location } = body;
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const numericCapacity =
        capacity === "" || capacity == null ? null : Number(capacity);
      const status = body.condition_status ?? "Available";

      if (!name) {
        return res.status(400).json({ message: "Facility name is required." });
      }
      if (name.length > 150) {
        return res.status(400).json({
          message: "Facility name must be 150 characters or fewer.",
        });
      }
      if (
        numericCapacity === null ||
        !Number.isInteger(numericCapacity) ||
        numericCapacity < 1 ||
        numericCapacity > 1000
      ) {
        return res.status(400).json({
          message: "Capacity must be a whole number between 1 and 1000.",
        });
      }
      if (typeof location !== "string" || !location.trim()) {
        return res.status(400).json({ message: "Facility location is required." });
      }
      if (location.trim().length > 150) {
        return res.status(400).json({
          message: "Location must be 150 characters or fewer.",
        });
      }
      if (typeof description !== "string" || !description.trim()) {
        return res.status(400).json({
          message: "Facility description is required.",
        });
      }
      if (Buffer.byteLength(description.trim(), "utf8") > 65535) {
        return res.status(400).json({ message: "Description is too long." });
      }
      if (!facilityStatuses.includes(status)) {
        return res.status(400).json({
          message: "Select a valid facility condition.",
        });
      }

      const imageUrl = req.file
        ? `/uploads/facilities/${req.file.filename}`
        : null;
      const isAvailable = status === "Available" ? 1 : 0;
      const [result] = await pool.query(
        `INSERT INTO facilities
          (name, description, capacity, location, image_url,
           is_available, condition_status, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          name,
          description.trim(),
          numericCapacity,
          location.trim(),
          imageUrl,
          isAvailable,
          status,
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
        newRows[0]
      );

      res.status(201).json({
        message: "Facility added successfully",
        id: result.insertId,
        image_url: imageUrl,
      });
    } catch (error) {
      respondToFacilityError(error, res, "Create facility");
    }
  },
];

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
        condition_status,
        is_active,
      } = req.body || {};

      const [existingRows] = await pool.query(
        "SELECT * FROM facilities WHERE id = ?",
        [id]
      );
      if (existingRows.length === 0) {
        return res.status(404).json({ message: "Facility not found" });
      }

      const oldValues = existingRows[0];
      const normalizedName = typeof name === "string" ? name.trim() : name;
      if (name !== undefined && !normalizedName) {
        return res.status(400).json({ message: "Facility name is required." });
      }
      if (normalizedName && normalizedName.length > 150) {
        return res.status(400).json({
          message: "Facility name must be 150 characters or fewer.",
        });
      }
      if (
        capacity !== undefined &&
        capacity !== null &&
        capacity !== "" &&
        (!Number.isInteger(Number(capacity)) ||
          Number(capacity) < 1 ||
          Number(capacity) > 1000)
      ) {
        return res.status(400).json({
          message: "Capacity must be a whole number between 1 and 1000.",
        });
      }
      if (
        condition_status !== undefined &&
        !facilityStatuses.includes(condition_status)
      ) {
        return res.status(400).json({
          message: "Select a valid facility condition.",
        });
      }
      if (
        is_available !== undefined &&
        ![0, 1, "0", "1", false, true].includes(is_available)
      ) {
        return res.status(400).json({
          message: "Select a valid facility availability status.",
        });
      }

      const nextStatus =
        condition_status ??
        (is_available === undefined
          ? undefined
          : Number(is_available) === 1
            ? "Available"
            : "Unavailable");
      const nextAvailability =
        nextStatus === undefined
          ? null
          : nextStatus === "Available"
            ? 1
            : 0;
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
          condition_status = COALESCE(?, condition_status),
          is_available = COALESCE(?, is_available),
          is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [
          normalizedName ?? null,
          description ?? null,
          capacity === "" ? null : capacity ?? null,
          location ?? null,
          imageUrl,
          nextStatus ?? null,
          nextAvailability,
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
      } else if (oldValues.condition_status !== newValues.condition_status) {
        action = "Facility Condition Changed";
      } else if (
        Number(oldValues.is_available) !== Number(newValues.is_available)
      ) {
        action = "Facility Availability Changed";
      }

      await saveAuditLog(req, action, "facilities", id, oldValues, newValues);
      res.status(200).json({
        message: "Facility updated successfully",
        image_url: imageUrl,
      });
    } catch (error) {
      respondToFacilityError(error, res, "Update facility");
    }
  },
];
