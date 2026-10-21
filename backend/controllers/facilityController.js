
const pool = require("../config/db");
const saveAuditLog = require("../utils/auditLogger");

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

// GET ALL FACILITIES
exports.getAllFacilities = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, description, capacity, location,
              is_available, condition_status, is_active
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

    res.status(201).json({
      message: "Facility added successfully",
      id: result.insertId,
    });
  } catch (error) {
    respondToFacilityError(error, res, "Create facility");
  }
};

// UPDATE FACILITY
exports.updateFacility = async (req, res) => {
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
        id,
      ]
    );

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
