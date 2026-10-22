const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pool = require("../config/db");
const saveAuditLog = require("../utils/auditLogger");
const { logActivity } = require("./activityController");
const { notifyAdmins } = require("../utils/notificationHelper");

// =============================================
// FACILITY PHOTO UPLOAD
// =============================================

const facilityUploadPath = path.join(__dirname, "../uploads/facilities");

if (!fs.existsSync(facilityUploadPath)) {
  fs.mkdirSync(facilityUploadPath, { recursive: true });
}

const facilityStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, facilityUploadPath);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = req.user?.id || req.user?.userId || "facility";

    cb(null, `facility_${userId}_${Date.now()}${ext}`);
  },
});

const facilityUpload = multer({
  storage: facilityStorage,
  limits: { fileSize: 2 * 1024 * 1024 },

  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const isJpeg =
      [".jpg", ".jpeg"].includes(extension) &&
      file.mimetype === "image/jpeg";

    const isPng =
      extension === ".png" &&
      file.mimetype === "image/png";

    if (isJpeg || isPng) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG, and PNG files are allowed."));
    }
  },
});

const uploadFacilityImage = (req, res, next) => {
  facilityUpload.single("image")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    next();
  });
};

const respondToFacilityError = (error, res, operation) => {
  console.error(operation + " error:", error);
  res.status(500).json({ message: "Server error" });
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
    console.error("Get facility error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE FACILITY
exports.createFacility = [
  uploadFacilityImage,
  async (req, res) => {
  try {
    const body = req.body || {};
    if (!req.file) {
      return res.status(400).json({
        message: "Facility photo is required.",
      });
    }
    const {
      description,
      capacity,
      location,
    } = body;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const requestedAvailability = body.is_available ?? 1;

    if (!name) {
      return res.status(400).json({
        message: "Facility name is required.",
      });
    }

    if (name.length > 150) {
      return res.status(400).json({
        message: "Facility name must be 150 characters or fewer.",
      });
    }

    const numericCapacity = capacity === "" || capacity == null
      ? null
      : Number(capacity);
    if (
      numericCapacity !== null &&
      (!Number.isInteger(numericCapacity) ||
        numericCapacity < 1 ||
        numericCapacity > 1000)
    ) {
      return res.status(400).json({
        message: "Capacity must be a whole number between 1 and 1000.",
      });
    }

    for (const [field, value, maxLength] of [
      ["Location", location, 150],
    ]) {
      if (value != null && typeof value !== "string") {
        return res.status(400).json({
          message: `${field} must be text.`,
        });
      }
      if (typeof value === "string" && value.trim().length > maxLength) {
        return res.status(400).json({
          message: `${field} must be ${maxLength} characters or fewer.`,
        });
      }
    }

    if (description != null && typeof description !== "string") {
      return res.status(400).json({
        message: "Description must be text.",
      });
    }
    if (
      description != null &&
      Buffer.byteLength(description.trim(), "utf8") > 65535
    ) {
      return res.status(400).json({
        message: "Description is too long.",
      });
    }

    if (![0, 1, "0", "1", false, true].includes(requestedAvailability)) {
      return res.status(400).json({
        message: "Select a valid facility availability status.",
      });
    }

    const conditionStatus =
      body.condition_status ??
      (Number(requestedAvailability) === 1 ? "Available" : "Unavailable");
    if (
      !["Available", "Unavailable", "Under maintenance"].includes(
        conditionStatus
      )
    ) {
      return res.status(400).json({
        message: "Select a valid facility condition.",
      });
    }

    const imageUrl = `/uploads/facilities/${req.file.filename}`;

    const finalConditionStatus = conditionStatus;
    const finalAvailability =
      finalConditionStatus === "Available" ? 1 : 0;

    const [result] = await pool.query(
      `INSERT INTO facilities
        (name, description, capacity, location, image_url,
        is_available, condition_status, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        name,
        typeof description === "string"
          ? description.trim() || null
          : null,
        numericCapacity,
        typeof location === "string"
          ? location.trim() || null
          : null,
        imageUrl,
        finalAvailability,
        finalConditionStatus,
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
        is_available: conditionStatus === "Available" ? 1 : 0,
        condition_status: conditionStatus,
        is_active: 1,
      }
    );

    const userId = req.user?.id || req.user?.userId;

    await logActivity(
      userId,
      "Facility Created",
      `Added facility: ${name}`,
      "facility",
      result.insertId
    );

    await notifyAdmins(
      "New Facility Added",
      `A new facility, ${name}, has been added.`,
      "facility",
      "facility_created"
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

// UPDATE FACILITY
exports.updateFacility = [
  uploadFacilityImage,
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
    } = req.body;

    if (
      condition_status !== undefined &&
      !["Available", "Unavailable", "Under maintenance"].includes(
        condition_status
      )
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
      name !== undefined &&
      (typeof name !== "string" ||
        name.trim() === "" ||
        name.trim().length > 150)
    ) {
      return res.status(400).json({
        message: "Facility name is required and must not exceed 150 characters.",
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be text.",
      });
    }

    if (
      location !== undefined &&
      location !== null &&
      typeof location !== "string"
    ) {
      return res.status(400).json({
        message: "Location must be text.",
      });
    }

    if (
      is_active !== undefined &&
      ![0, 1, "0", "1", false, true].includes(is_active)
    ) {
      return res.status(400).json({
        message: "Select a valid activation status.",
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

    const existingFacility = existingRows[0];

    const imageUrl = req.file
      ? `/uploads/facilities/${req.file.filename}`
      : existingFacility.image_url;

    const oldValues = existingRows[0];
    let nextConditionStatus = condition_status;

    if (nextConditionStatus === undefined && is_available !== undefined) {
      nextConditionStatus = Number(is_available) === 1
        ? "Available"
        : "Unavailable";
    }

    const nextAvailability =
      nextConditionStatus === undefined
        ? null
        : nextConditionStatus === "Available"
        ? 1
        : 0;

    await pool.query(
      `UPDATE facilities SET
        name = COALESCE(?, name),
        description = ?,
        capacity = ?,
        location = ?,
        image_url = COALESCE(?, image_url),
        condition_status = COALESCE(?, condition_status),
        is_available = COALESCE(?, is_available),
        is_active = COALESCE(?, is_active)
      WHERE id = ?`,
      [
        name === undefined ? null : name,
        description === undefined
          ? oldValues.description
          : description === null
            ? null
            : description.trim() || null,
        capacity === undefined
          ? oldValues.capacity
          : capacity === ""
          ? null
          : capacity,
        location === undefined
          ? oldValues.location
          : location === null
            ? null
            : location.trim() || null,
        req.file ? imageUrl : null,
        nextConditionStatus ?? null,
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
    } else if (
      Number(oldValues.is_active) === 0 &&
      Number(newValues.is_active) === 1
    ) {
      action = "Facility Reactivated";
    } else if (
      oldValues.condition_status !== newValues.condition_status
    ) {
      action = "Facility Condition Changed";
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

    const userId = req.user?.id || req.user?.userId;

    await logActivity(
      userId,
      action,
      `Updated facility: ${newValues.name}`,
      "facility",
      id
    );

    if (
      Number(oldValues.is_active) === 1 &&
      Number(newValues.is_active) === 0
    ) {
      await notifyAdmins(
        "Facility Deactivated",
        `Facility ${newValues.name} has been deactivated.`,
        "facility",
        "facility_deactivated"
      );
    } else if (
      Number(oldValues.is_active) === 0 &&
      Number(newValues.is_active) === 1
    ) {
      await notifyAdmins(
        "Facility Reactivated",
        `Facility ${newValues.name} has been reactivated.`,
        "facility",
        "facility_reactivated"
      );
    }

    res.status(200).json({
      message: "Facility updated successfully",
    });
  } catch (error) {
    respondToFacilityError(error, res, "Update facility");
  }
},
];
