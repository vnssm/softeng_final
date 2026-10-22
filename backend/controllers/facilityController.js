
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pool = require("../config/db");
const saveAuditLog = require("../utils/auditLogger");
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
      return res.status(400).json({ message: error.message });
    }

    next();
  });
};

// =============================================
// VALIDATE FACILITY VALUES
// =============================================

const validFacilityStatuses = ["Available", "Unavailable"];

const isValidBooleanValue = (value) =>
  [0, 1, "0", "1", false, true].includes(value);

const convertBooleanValue = (value) =>
  value === true || value === 1 || value === "1" ? 1 : 0;

// =============================================
// RECORD FACILITY ACTIVITY
// =============================================

const logFacilityActivity = async (
  req,
  actionType,
  description,
  facilityId
) => {
  try {
    const userId = req.user.id || req.user.userId;

    await pool.query(
      `INSERT INTO activity_logs
       (user_id, action_type, description, related_type, related_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, actionType, description, "facility", facilityId]
    );
  } catch (error) {
    console.error("Facility activity log error:", error.message);
  }
};

// =============================================
// ERROR HANDLER
// =============================================

const respondToFacilityError = (error, res, operation) => {
  console.error(operation + " error:", error);
  res.status(500).json({ message: "Server error" });
};

// =============================================
// GET ALL FACILITIES
// =============================================

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

// =============================================
// GET SINGLE FACILITY
// =============================================

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
    respondToFacilityError(error, res, "Get facility by ID");
  }
};

// =============================================
// CREATE FACILITY
// =============================================

exports.createFacility = [
  uploadFacilityImage,

  async (req, res) => {
    try {
      const body = req.body || {};

      const name =
        typeof body.name === "string" ? body.name.trim() : "";

      const { description, capacity, location } = body;
      const requestedAvailability = body.is_available ?? 1;

      if (!req.file) {
        return res.status(400).json({
          message: "Facility photo is required.",
        });
      }

      if (!name || name.length > 150) {
        return res.status(400).json({
          message: "Facility name is required and must not exceed 150 characters.",
        });
      }

      let numericCapacity = null;

      if (capacity !== undefined && capacity !== null && capacity !== "") {
        numericCapacity = Number(capacity);

        if (
          !Number.isInteger(numericCapacity) ||
          numericCapacity < 1 ||
          numericCapacity > 200
        ) {
          return res.status(400).json({
            message: "Capacity must be a whole number between 1 and 200.",
          });
        }
      }

      if (!isValidBooleanValue(requestedAvailability)) {
        return res.status(400).json({
          message: "Select a valid facility availability status.",
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
        typeof location === "string" &&
        (!location.trim() || location.trim().length > 150)
      ) {
        return res.status(400).json({
          message: "Location is required and must not exceed 150 characters.",
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
        typeof description === "string" &&
        Buffer.byteLength(description.trim(), "utf8") > 65535
      ) {
        return res.status(400).json({
          message: "Description is too long.",
        });
      }

      const conditionStatus =
        body.condition_status ??
        (convertBooleanValue(requestedAvailability) === 1
          ? "Available"
          : "Unavailable");

      if (!validFacilityStatuses.includes(conditionStatus)) {
        return res.status(400).json({
          message: "Select a valid facility condition.",
        });
      }

      const finalAvailability =
        conditionStatus === "Available" ? 1 : 0;

      const imageUrl = `/uploads/facilities/${req.file.filename}`;

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
          typeof location === "string" ? location.trim() : null,
          imageUrl,
          finalAvailability,
          conditionStatus,
        ]
      );

      const [newRows] = await pool.query(
        "SELECT * FROM facilities WHERE id = ?",
        [result.insertId]
      );

      const newValues = newRows[0];

      await saveAuditLog(
        req,
        "Facility Created",
        "facilities",
        result.insertId,
        null,
        newValues
      );

      await logFacilityActivity(
        req,
        "facility_added",
        "Added facility: " + newValues.name,
        result.insertId
      );

      await notifyAdmins(
        "New Facility Added",
        "GSD personnel added a new facility: " + newValues.name + ".",
        "facility",
        "facility_added"
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

// =============================================
// UPDATE FACILITY
// =============================================

exports.updateFacility = [
  uploadFacilityImage,

  async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body || {};

      const {
        name,
        description,
        capacity,
        location,
        condition_status,
        is_available,
        is_active,
      } = body;

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

      if (
        name !== undefined &&
        (typeof name !== "string" ||
          !name.trim() ||
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
        typeof description === "string" &&
        Buffer.byteLength(description.trim(), "utf8") > 65535
      ) {
        return res.status(400).json({
          message: "Description is too long.",
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
        typeof location === "string" &&
        location.trim().length > 150
      ) {
        return res.status(400).json({
          message: "Location must be 150 characters or fewer.",
        });
      }

      if (
        is_available !== undefined &&
        !isValidBooleanValue(is_available)
      ) {
        return res.status(400).json({
          message: "Select a valid facility availability status.",
        });
      }

      if (
        is_active !== undefined &&
        !isValidBooleanValue(is_active)
      ) {
        return res.status(400).json({
          message: "Select a valid activation status.",
        });
      }

      let newCapacity = oldValues.capacity;

      if (capacity !== undefined) {
        if (capacity === null || capacity === "") {
          newCapacity = null;
        } else {
          newCapacity = Number(capacity);

          if (
            !Number.isInteger(newCapacity) ||
            newCapacity < 1 ||
            newCapacity > 200
          ) {
            return res.status(400).json({
              message: "Capacity must be a whole number between 1 and 200.",
            });
          }
        }
      }

      let newCondition = oldValues.condition_status;

      if (condition_status !== undefined) {
        if (!validFacilityStatuses.includes(condition_status)) {
          return res.status(400).json({
            message: "Facility status must be Available or Unavailable.",
          });
        }

        newCondition = condition_status;
      } else if (is_available !== undefined) {
        newCondition =
          convertBooleanValue(is_available) === 1
            ? "Available"
            : "Unavailable";
      }

      const newAvailability =
        newCondition === "Available" ? 1 : 0;

      const imageUrl = req.file
        ? `/uploads/facilities/${req.file.filename}`
        : oldValues.image_url || null;

      const newActiveStatus =
        is_active === undefined
          ? oldValues.is_active
          : convertBooleanValue(is_active);

      await pool.query(
        `UPDATE facilities SET
          name = COALESCE(?, name),
          description = ?,
          capacity = ?,
          location = ?,
          image_url = ?,
          condition_status = ?,
          is_available = ?,
          is_active = ?
         WHERE id = ?`,
        [
          name === undefined ? null : name.trim(),
          description === undefined
            ? oldValues.description
            : description === null
              ? null
              : description.trim() || null,
          newCapacity,
          location === undefined
            ? oldValues.location
            : location === null
              ? null
              : location.trim() || null,
          imageUrl,
          newCondition,
          newAvailability,
          newActiveStatus,
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
        Number(oldValues.capacity) !== Number(newValues.capacity)
      ) {
        action = "Facility Capacity Updated";
      }

      await saveAuditLog(
        req,
        action,
        "facilities",
        id,
        oldValues,
        newValues
      );

      let activityAction = "facility_edited";
      let activityDescription = "Edited facility: " + newValues.name;

      if (action === "Facility Deactivated") {
        activityAction = "facility_deactivated";
        activityDescription = "Deactivated facility: " + newValues.name;
      } else if (action === "Facility Reactivated") {
        activityAction = "facility_reactivated";
        activityDescription = "Reactivated facility: " + newValues.name;
      }

      await logFacilityActivity(
        req,
        activityAction,
        activityDescription,
        id
      );

      let notificationTitle = "Facility Details Updated";
      let notificationMessage =
        "GSD personnel updated the facility: " + newValues.name + ".";
      let notificationType = "facility_updated";

      if (action === "Facility Deactivated") {
        notificationTitle = "Facility Deactivated";
        notificationMessage =
          "Facility " + newValues.name + " was made inactive.";
        notificationType = "facility_deactivated";
      } else if (action === "Facility Reactivated") {
        notificationTitle = "Facility Reactivated";
        notificationMessage =
          "Facility " + newValues.name + " was reactivated and is active again.";
        notificationType = "facility_reactivated";
      } else if (action === "Facility Condition Changed") {
        notificationTitle = "Facility Availability Changed";
        notificationMessage =
          "The availability of facility " +
          newValues.name +
          " was changed to " +
          newValues.condition_status +
          ".";
        notificationType = "facility_availability_changed";
      } else if (action === "Facility Capacity Updated") {
        notificationTitle = "Facility Capacity Updated";
        notificationMessage =
          "The capacity of facility " + newValues.name + " was updated.";
        notificationType = "facility_capacity_updated";
      }

      await notifyAdmins(
        notificationTitle,
        notificationMessage,
        "facility",
        notificationType
      );

      res.status(200).json({
        message: "Facility updated successfully",
        image_url: imageUrl,
      });
    } catch (error) {
      respondToFacilityError(error, res, "Update facility");
    }
  },
];
