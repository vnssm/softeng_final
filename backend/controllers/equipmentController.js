
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
    const {
      name,
      description,
      category,
      quantity_total,
      location,
      condition_status = "Good",
    } = req.body;

    if (!name || !quantity_total) {
      return res.status(400).json({
        message: "Name and quantity are required",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO equipment
        (name, description, category, quantity_total,
         quantity_available, condition_status, location)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        category || null,
        quantity_total,
        quantity_total,
        condition_status,
        location || null,
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
