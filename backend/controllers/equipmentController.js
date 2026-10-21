
const pool = require("../config/db");
const saveAuditLog = require("../utils/auditLogger");

// GET ALL EQUIPMENT
exports.getAllEquipment = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, description, category, quantity_total,
              quantity_available, condition_status, location, is_active
       FROM equipment
       ORDER BY name ASC`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("Get equipment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET SINGLE EQUIPMENT
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

// CREATE EQUIPMENT
exports.createEquipment = async (req, res) => {
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

    if (!name) {
      return res.status(400).json({
        message: "Equipment name is required.",
      });
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

    if (
      !["Available", "Unavailable", "Under maintenance"].includes(
        condition_status
      )
    ) {
      return res.status(400).json({
        message: "Select a valid equipment condition.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO equipment
        (name, description, category, quantity_total,
         quantity_available, condition_status, location)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description?.trim() || null,
        category?.trim() || null,
        quantity,
        quantity,
        condition_status,
        location?.trim() || null,
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
      newRows[0] || {
        name,
        description,
        category,
        quantity_total,
        quantity_available: quantity_total,
        condition_status,
        location,
      }
    );

    res.status(201).json({
      message: "Equipment added successfully",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Create equipment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE EQUIPMENT
exports.updateEquipment = async (req, res) => {
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
    } = req.body;

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

    if (
      condition_status !== undefined &&
      !["Available", "Unavailable", "Under maintenance"].includes(
        condition_status
      )
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

    await pool.query(
      `UPDATE equipment SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        quantity_total = COALESCE(?, quantity_total),
        quantity_available = COALESCE(?, quantity_available),
        condition_status = COALESCE(?, condition_status),
        location = COALESCE(?, location),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name ?? null,
        description ?? null,
        category ?? null,
        quantity_total ?? null,
        quantity_available ?? null,
        condition_status ?? null,
        location ?? null,
        is_active ?? null,
        id,
      ]
    );

    const [updatedRows] = await pool.query(
      "SELECT * FROM equipment WHERE id = ?",
      [id]
    );

    const newValues = updatedRows[0];

    const wasDeactivated =
      Number(oldValues.is_active) === 1 &&
      Number(newValues.is_active) === 0;

    let action = "Equipment Updated";

    if (
      Number(oldValues.is_active) === 1 &&
      Number(newValues.is_active) === 0
    ) {
      action = "Equipment Deactivated";
    } else if (
      oldValues.condition_status !== newValues.condition_status
    ) {
      action = "Equipment Condition Changed";
    } else if (
      Number(oldValues.quantity_total) !== Number(newValues.quantity_total) ||
      Number(oldValues.quantity_available) !== Number(newValues.quantity_available)
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

    res.status(200).json({
      message: "Equipment updated successfully",
    });
  } catch (error) {
    console.error("Update equipment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
