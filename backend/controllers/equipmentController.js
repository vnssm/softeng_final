
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pool = require("../config/db");
const saveAuditLog = require("../utils/auditLogger");
const { notifyAdmins } = require("../utils/notificationHelper");

// =============================================
// EQUIPMENT PHOTO UPLOAD
// =============================================

const equipmentUploadPath = path.join(__dirname, "../uploads/equipment");

if (!fs.existsSync(equipmentUploadPath)) {
  fs.mkdirSync(equipmentUploadPath, { recursive: true });
}

const equipmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, equipmentUploadPath),

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = req.user?.id || req.user?.userId || "equipment";

    cb(null, `equipment_${userId}_${Date.now()}${ext}`);
  },
});

const equipmentUpload = multer({
  storage: equipmentStorage,
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

const uploadEquipmentImage = (req, res, next) => {
  equipmentUpload.single("image")(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    next();
  });
};

// =============================================
// VALID STATUSES
// =============================================

const validEquipmentStatuses = [
  "Available",
  "Unavailable",
  "Under Maintenance",
];

const validConditionStatuses = [
  "Good",
  "Needs Repair",
  "Damaged",
];

// =============================================
// RECORD EQUIPMENT ACTIVITY
// =============================================

const logEquipmentActivity = async (
  req,
  actionType,
  description,
  equipmentId
) => {
  try {
    const userId = req.user.id || req.user.userId;

    await pool.query(
      `INSERT INTO activity_logs
       (user_id, action_type, description, related_type, related_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, actionType, description, "equipment", equipmentId]
    );
  } catch (error) {
    console.error("Equipment activity log error:", error.message);
  }
};

// =============================================
// FORMAT EQUIPMENT FOR THE FRONTEND
// =============================================

const formatEquipment = (item) => ({
  ...item,
  condition_status:
    item.condition_status === "Good"
      ? "Available"
      : item.condition_status,
});

// =============================================
// GET ALL EQUIPMENT
// =============================================


exports.getAllEquipment = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, description, category, quantity_total,
              quantity_available, equipment_status, condition_status,
              location, image_url, is_active
       FROM equipment
       WHERE is_active = 1
       ORDER BY name ASC`
    );

    res.status(200).json(rows.map(formatEquipment));
  } catch (error) {
    console.error("Get equipment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// =============================================
// GET SINGLE EQUIPMENT
// =============================================

exports.getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM equipment WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Equipment not found",
      });
    }

    res.status(200).json(formatEquipment(rows[0]));
  } catch (error) {
    console.error("Get equipment by id error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// CREATE EQUIPMENT
// =============================================

exports.createEquipment = [
  uploadEquipmentImage,

  async (req, res) => {
    try {
      const body = req.body || {};

      const name =
        typeof body.name === "string" ? body.name.trim() : "";
      const description = body.description;
      const category = body.category;
      const quantity_total = body.quantity_total;
      const location = body.location;
      const equipment_status = body.equipment_status || "Available";
      const condition_status = body.condition_status || "Good";

      if (!req.file) {
        return res.status(400).json({
          message: "Equipment photo is required.",
        });
      }

      if (!name || name.length > 150) {
        return res.status(400).json({
          message: "Equipment name is required and must not exceed 150 characters.",
        });
      }

      const quantity = Number(quantity_total);

      if (
        quantity_total === undefined ||
        quantity_total === null ||
        quantity_total === "" ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 500
      ) {
        return res.status(400).json({
          message: "Quantity must be a whole number between 1 and 500.",
        });
      }

      for (const [field, value, maxLength] of [
        ["Category", category, 100],
        ["Location", location, 150],
      ]) {
        if (
          typeof value !== "string" ||
          !value.trim() ||
          value.trim().length > maxLength
        ) {
          return res.status(400).json({
            message: field + " is required and must not exceed " +
              maxLength + " characters.",
          });
        }
      }

      if (
        typeof description !== "string" ||
        !description.trim() ||
        Buffer.byteLength(description.trim(), "utf8") > 65535
      ) {
        return res.status(400).json({
          message: "Enter a valid equipment description.",
        });
      }

      if (!validEquipmentStatuses.includes(equipment_status)) {
        return res.status(400).json({
          message: "Invalid equipment status.",
        });
      }

      if (!validConditionStatuses.includes(condition_status)) {
        return res.status(400).json({
          message: "Invalid equipment condition.",
        });
      }

      const imageUrl = `/uploads/equipment/${req.file.filename}`;

      const [result] = await pool.query(
        `INSERT INTO equipment
          (name, description, category, quantity_total,
           quantity_available, equipment_status, condition_status,
           location, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          description.trim(),
          category.trim(),
          quantity,
          quantity,
          equipment_status,
          condition_status,
          location.trim(),
          imageUrl,
        ]
      );

      const [newRows] = await pool.query(
        "SELECT * FROM equipment WHERE id = ?",
        [result.insertId]
      );

      const newValues = newRows[0];

      await saveAuditLog(
        req,
        "Equipment Created",
        "equipment",
        result.insertId,
        null,
        newValues
      );

      await logEquipmentActivity(
        req,
        "equipment_added",
        "Added equipment: " + newValues.name,
        result.insertId
      );

      await notifyAdmins(
        "New Equipment Added",
        "GSD personnel added new equipment: " + newValues.name + ".",
        "equipment",
        "equipment_added"
      );

      res.status(201).json({
        message: "Equipment added successfully",
        id: result.insertId,
        image_url: imageUrl,
      });
    } catch (error) {
      console.error("Create equipment error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
];

// =============================================
// UPDATE EQUIPMENT
// =============================================

exports.updateEquipment = [
  uploadEquipmentImage,

  async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body || {};

      const {
        name,
        description,
        category,
        quantity_total,
        equipment_status,
        condition_status,
        location,
        is_active,
      } = body;

      const [existingRows] = await pool.query(
        "SELECT * FROM equipment WHERE id = ?",
        [id]
      );

      if (existingRows.length === 0) {
        return res.status(404).json({
          message: "Equipment not found",
        });
      }

      const oldValues = existingRows[0];

      const normalizedName =
        typeof name === "string" ? name.trim() : name;

      if (
        name !== undefined &&
        (typeof normalizedName !== "string" ||
          !normalizedName ||
          normalizedName.length > 150)
      ) {
        return res.status(400).json({
          message: "Equipment name is required and must not exceed 150 characters.",
        });
      }

      if (
        category !== undefined &&
        (typeof category !== "string" ||
          !category.trim() ||
          category.trim().length > 100)
      ) {
        return res.status(400).json({
          message: "Enter a valid equipment category.",
        });
      }

      if (
        location !== undefined &&
        (typeof location !== "string" ||
          !location.trim() ||
          location.trim().length > 150)
      ) {
        return res.status(400).json({
          message: "Enter a valid equipment location.",
        });
      }

      if (
        description !== undefined &&
        (typeof description !== "string" ||
          !description.trim() ||
          Buffer.byteLength(description.trim(), "utf8") > 65535)
      ) {
        return res.status(400).json({
          message: "Enter a valid equipment description.",
        });
      }

      if (
        equipment_status !== undefined &&
        !validEquipmentStatuses.includes(equipment_status)
      ) {
        return res.status(400).json({
          message: "Invalid equipment status.",
        });
      }

      if (
        condition_status !== undefined &&
        !validConditionStatuses.includes(condition_status)
      ) {
        return res.status(400).json({
          message: "Invalid equipment condition.",
        });
      }

      let newTotal = Number(oldValues.quantity_total);

      if (quantity_total !== undefined) {
        newTotal = Number(quantity_total);

        if (
          quantity_total === null ||
          quantity_total === "" ||
          !Number.isInteger(newTotal) ||
          newTotal < 1 ||
          newTotal > 500
        ) {
          return res.status(400).json({
            message: "Quantity must be a whole number between 1 and 500.",
          });
        }
      }

      const borrowed =
        Number(oldValues.quantity_total) -
        Number(oldValues.quantity_available);

      if (newTotal < borrowed) {
        return res.status(400).json({
          message:
            "Total quantity cannot be less than the number of units currently borrowed.",
        });
      }

      const newAvailable = newTotal - borrowed;

      let newActiveStatus = oldValues.is_active;

      if (is_active !== undefined) {
        if (![0, 1, "0", "1", true, false].includes(is_active)) {
          return res.status(400).json({
            message: "Select a valid active/inactive status.",
          });
        }

        newActiveStatus =
          is_active === true || is_active === 1 || is_active === "1"
            ? 1
            : 0;
      }

      const imageUrl = req.file
        ? `/uploads/equipment/${req.file.filename}`
        : oldValues.image_url || null;

      await pool.query(
        `UPDATE equipment SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          quantity_total = ?,
          quantity_available = ?,
          equipment_status = COALESCE(?, equipment_status),
          condition_status = COALESCE(?, condition_status),
          location = COALESCE(?, location),
          image_url = ?,
          is_active = ?
         WHERE id = ?`,
        [
          name === undefined ? null : normalizedName,
          description === undefined ? null : description.trim(),
          category === undefined ? null : category.trim(),
          newTotal,
          newAvailable,
          equipment_status === undefined ? null : equipment_status,
          condition_status === undefined ? null : condition_status,
          location === undefined ? null : location.trim(),
          imageUrl,
          newActiveStatus,
          id,
        ]
      );

      const [updatedRows] = await pool.query(
        "SELECT * FROM equipment WHERE id = ?",
        [id]
      );

      const newValues = updatedRows[0];

      let action = "Equipment Updated";

      if (
        Number(oldValues.is_active) === 1 &&
        Number(newValues.is_active) === 0
      ) {
        action = "Equipment Deactivated";
      } else if (
        Number(oldValues.is_active) === 0 &&
        Number(newValues.is_active) === 1
      ) {
        action = "Equipment Reactivated";
      } else if (
        oldValues.equipment_status !== newValues.equipment_status
      ) {
        action = "Equipment Status Changed";
      } else if (
        oldValues.condition_status !== newValues.condition_status
      ) {
        action = "Equipment Condition Changed";
      } else if (
        Number(oldValues.quantity_total) !== Number(newValues.quantity_total) ||
        Number(oldValues.quantity_available) !==
          Number(newValues.quantity_available)
      ) {
        action = "Equipment Quantity Updated";
      }

      await saveAuditLog(
        req,
        action,
        "equipment",
        id,
        oldValues,
        newValues
      );

      let activityAction = "equipment_edited";
      let activityDescription = "Edited equipment: " + newValues.name;

      if (action === "Equipment Deactivated") {
        activityAction = "equipment_deactivated";
        activityDescription = "Deactivated equipment: " + newValues.name;
      } else if (action === "Equipment Reactivated") {
        activityAction = "equipment_reactivated";
        activityDescription = "Reactivated equipment: " + newValues.name;
      }

      await logEquipmentActivity(
        req,
        activityAction,
        activityDescription,
        id
      );

      let notificationTitle = "Equipment Details Updated";
      let notificationMessage =
        "GSD personnel updated equipment: " + newValues.name + ".";
      let notificationType = "equipment_updated";

      if (action === "Equipment Deactivated") {
        notificationTitle = "Equipment Deactivated";
        notificationMessage =
          "Equipment " + newValues.name + " was made inactive.";
        notificationType = "equipment_deactivated";
      } else if (action === "Equipment Reactivated") {
        notificationTitle = "Equipment Reactivated";
        notificationMessage =
          "Equipment " + newValues.name + " was reactivated and is active again.";
        notificationType = "equipment_reactivated";
      } else if (action === "Equipment Status Changed") {
        notificationTitle = "Equipment Status Changed";
        notificationMessage =
          "The operational status of equipment " +
          newValues.name +
          " was changed to " +
          newValues.equipment_status +
          ".";
        notificationType = "equipment_status_changed";
      } else if (action === "Equipment Condition Changed") {
        notificationTitle = "Equipment Condition Changed";
        notificationMessage =
          "The condition of equipment " +
          newValues.name +
          " was changed to " +
          newValues.condition_status +
          ".";
        notificationType = "equipment_condition_changed";
      } else if (action === "Equipment Quantity Updated") {
        notificationTitle = "Equipment Quantity Updated";
        notificationMessage =
          "The quantity of equipment " + newValues.name + " was updated.";
        notificationType = "equipment_quantity_updated";
      }

      await notifyAdmins(
        notificationTitle,
        notificationMessage,
        "equipment",
        notificationType
      );

      res.status(200).json({
        message: "Equipment updated successfully",
        image_url: imageUrl,
      });
    } catch (error) {
      console.error("Update equipment error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
];
