
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pool = require("../config/db");
const saveAuditLog = require("../utils/auditLogger");

<<<<<<< HEAD
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
=======
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
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a

// GET ALL FACILITIES
exports.getAllFacilities = async (req, res) => {
  try {
    const [rows] = await pool.query(
<<<<<<< HEAD
      `SELECT id, name, description, capacity, location, image_url,
              is_available, is_active
=======
      `SELECT id, name, description, capacity, location,
              is_available, condition_status, is_active
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
       FROM facilities
       ORDER BY name ASC`
    );

    res.status(200).json(rows);
  } catch (error) {
    respondToFacilityError(error, res, "Get facilities");
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
<<<<<<< HEAD
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
=======
exports.createFacility = async (req, res) => {
  try {
    const body = req.body || {};
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

    const [result] = await pool.query(
      `INSERT INTO facilities
        (name, description, capacity, location, is_available, condition_status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        name,
        description?.trim() || null,
        numericCapacity,
        location?.trim() || null,
        conditionStatus === "Available" ? 1 : 0,
        conditionStatus,
      ]
    );
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a

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
<<<<<<< HEAD
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
=======
        is_available: conditionStatus === "Available" ? 1 : 0,
        condition_status: conditionStatus,
        is_active: 1,
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
      }

<<<<<<< HEAD
      if (typeof name === "string" && name.trim().length > 100) {
        return res.status(400).json({
          message: "Facility name must be 100 characters or fewer",
        });
      }
=======
    res.status(201).json({
      message: "Facility added successfully",
      id: result.insertId,
    });
  } catch (error) {
    respondToFacilityError(error, res, "Create facility");
  }
};
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a

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

<<<<<<< HEAD
      const [existingRows] = await pool.query(
        "SELECT * FROM facilities WHERE id = ?",
        [id]
      );

      if (existingRows.length === 0) {
        return res.status(404).json({
          message: "Facility not found",
        });
      }
=======
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
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a

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

<<<<<<< HEAD
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
=======
    const oldValues = existingRows[0];
    const nextConditionStatus =
      condition_status ??
      (is_available === undefined
        ? undefined
        : Number(is_available) === 1
        ? "Available"
        : "Unavailable");
    const nextAvailability =
      nextConditionStatus === undefined
        ? null
        : nextConditionStatus === "Available"
        ? 1
        : 0;

    await pool.query(
      `UPDATE facilities SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        capacity = COALESCE(?, capacity),
        location = COALESCE(?, location),
        condition_status = COALESCE(?, condition_status),
        is_available = COALESCE(?, is_available),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name ?? null,
        description ?? null,
        capacity === "" ? null : capacity ?? null,
        location ?? null,
        nextConditionStatus ?? null,
        nextAvailability,
        is_active === undefined
          ? null
          : Number(is_active) === 1
          ? 1
          : 0,
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
        id,
        oldValues,
        newValues
      );

<<<<<<< HEAD
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
=======
    const [updatedRows] = await pool.query(
      "SELECT * FROM facilities WHERE id = ?",
      [id]
    );

    const newValues = updatedRows[0];

    const wasDeactivated =
      Number(oldValues.is_active) === 1 &&
      Number(newValues.is_active) === 0;

    let action = "Facility Updated";

    if (
      Number(oldValues.is_active) === 1 &&
      Number(newValues.is_active) === 0
    ) {
      action = "Facility Deactivated";
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

    res.status(200).json({
      message: "Facility updated successfully",
    });
  } catch (error) {
    respondToFacilityError(error, res, "Update facility");
  }
};
>>>>>>> 6b3efdd1d5509a8a5b00a5a1d1005ad9fdd29b6a
