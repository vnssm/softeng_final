const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pool = require("../config/db");
const saveAuditLog = require("../utils/auditLogger");

const equipmentUploadPath = path.join(__dirname, "../uploads/equipment");

if (!fs.existsSync(equipmentUploadPath)) {
  fs.mkdirSync(equipmentUploadPath, { recursive: true });
}

const equipmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, equipmentUploadPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = req.user?.id || req.user?.userId || "equipment";
    cb(null, `equipment_${name}_${Date.now()}${ext}`);
  },
});

const equipmentUpload = multer({
  storage: equipmentStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isAllowedImage =
      [".jpg", ".jpeg"].includes(extension) && file.mimetype === "image/jpeg";
    const isAllowedPng =
      extension === ".png" && file.mimetype === "image/png";

    if (isAllowedImage || isAllowedPng) {
      cb(null, true);
      return;
    }

    cb(new Error("Only JPG, JPEG, and PNG files are allowed."));
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

const validConditionStatuses = [
  "Available",
  "Unavailable",
  "Under maintenance",
];

exports.getAllEquipment = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, description, category, quantity_total,
              quantity_available, condition_status, location, image_url, is_active
       FROM equipment
       ORDER BY name ASC`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("Get equipment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM equipment WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Equipment not found" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Get equipment by id error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createEquipment = [
  uploadEquipmentImage,
  async (req, res) => {
    try {
      const body = req.body || {};
      const {
        description,
        category,
        quantity_total,
        location,
        condition_status = "Available",
      } = body;
      const name = typeof body.name === "string" ? body.name.trim() : "";

      if (!req.file) {
        return res.status(400).json({ message: "Equipment photo is required." });
      }
      if (!name) {
        return res.status(400).json({ message: "Equipment name is required." });
      }
      if (name.length > 150) {
        return res.status(400).json({
          message: "Equipment name must be 150 characters or fewer.",
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
        if (typeof value !== "string" || !value.trim()) {
          return res.status(400).json({ message: `${field} is required.` });
        }
        if (value.trim().length > maxLength) {
          return res.status(400).json({
            message: `${field} must be ${maxLength} characters or fewer.`,
          });
        }
      }

      if (typeof description !== "string" || !description.trim()) {
        return res.status(400).json({
          message: "Equipment description is required.",
        });
      }
      if (Buffer.byteLength(description.trim(), "utf8") > 65535) {
        return res.status(400).json({ message: "Description is too long." });
      }
      if (!validConditionStatuses.includes(condition_status)) {
        return res.status(400).json({
          message: "Select a valid equipment condition.",
        });
      }

      const imageUrl = `/uploads/equipment/${req.file.filename}`;
      const [result] = await pool.query(
        `INSERT INTO equipment
          (name, description, category, quantity_total,
           quantity_available, condition_status, location, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          description.trim(),
          category.trim(),
          quantity,
          quantity,
          condition_status,
          location.trim(),
          imageUrl,
        ]
      );

      const [newRows] = await pool.query(
        "SELECT * FROM equipment WHERE id = ?",
        [result.insertId]
      );
      await saveAuditLog(
        req,
        "Equipment Created",
        "equipment",
        result.insertId,
        null,
        newRows[0]
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

exports.updateEquipment = [
  uploadEquipmentImage,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        category,
        quantity_total,
        quantity_available,
        condition_status,
        location,
        is_active,
      } = req.body || {};

      const [existingRows] = await pool.query(
        "SELECT * FROM equipment WHERE id = ?",
        [id]
      );
      if (existingRows.length === 0) {
        return res.status(404).json({ message: "Equipment not found" });
      }

      const oldValues = existingRows[0];
      const normalizedName = typeof name === "string" ? name.trim() : name;
      if (name !== undefined && !normalizedName) {
        return res.status(400).json({ message: "Equipment name is required." });
      }
      if (normalizedName && normalizedName.length > 150) {
        return res.status(400).json({
          message: "Equipment name must be 150 characters or fewer.",
        });
      }
      if (
        condition_status !== undefined &&
        !validConditionStatuses.includes(condition_status)
      ) {
        return res.status(400).json({
          message: "Select a valid equipment condition.",
        });
      }
      if (
        quantity_total !== undefined &&
        quantity_total !== null &&
        quantity_total !== "" &&
        (!Number.isInteger(Number(quantity_total)) ||
          Number(quantity_total) < 1 ||
          Number(quantity_total) > 500)
      ) {
        return res.status(400).json({
          message: "Quantity must be a whole number between 1 and 500.",
        });
      }

      const imageUrl = req.file
        ? `/uploads/equipment/${req.file.filename}`
        : oldValues.image_url || null;
      await pool.query(
        `UPDATE equipment SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          quantity_total = COALESCE(?, quantity_total),
          quantity_available = COALESCE(?, quantity_available),
          condition_status = COALESCE(?, condition_status),
          location = COALESCE(?, location),
          image_url = ?,
          is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [
          normalizedName ?? null,
          description ?? null,
          category ?? null,
          quantity_total ?? null,
          quantity_available ?? null,
          condition_status ?? null,
          location ?? null,
          imageUrl,
          is_active ?? null,
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
      } else if (oldValues.condition_status !== newValues.condition_status) {
        action = "Equipment Condition Changed";
      } else if (
        Number(oldValues.quantity_total) !== Number(newValues.quantity_total) ||
        Number(oldValues.quantity_available) !==
          Number(newValues.quantity_available)
      ) {
        action = "Equipment Quantity Updated";
      }

      await saveAuditLog(req, action, "equipment", id, oldValues, newValues);
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
