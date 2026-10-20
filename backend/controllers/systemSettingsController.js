
const pool = require("../config/db");
const saveAuditLog = require("../utils/auditLogger");

const generalDefaults = {
  officeName: "General Services Directorate",
  contactEmail: "gsd@mmsu.edu.ph",
  operatingHours: "8:00 AM - 5:00 PM",
  campusLocation: "Batac City, Ilocos Norte",
};

const policyDefaults = {
  autoDetectConflicts: true,
  requireInspection: false,
  maxBorrowingDays: 67,
};

const notificationDefaults = {
  emailApprovalAlerts: true,
  returnDueReminders: false,
};

const securityDefaults = {
  roleBasedAccess: true,
  sessionTimeout: false,
};

const defaultSettings = {
  ...generalDefaults,
  ...policyDefaults,
  ...notificationDefaults,
  ...securityDefaults,
};

const generalKeys = Object.keys(generalDefaults);
const policyKeys = Object.keys(policyDefaults);
const notificationKeys = Object.keys(notificationDefaults);
const securityKeys = Object.keys(securityDefaults);

const sectionKeys = {
  general: generalKeys,
  policies: policyKeys,
  notifications: notificationKeys,
  security: securityKeys,
};

const booleanKeys = [
  "autoDetectConflicts",
  "requireInspection",
  "emailApprovalAlerts",
  "returnDueReminders",
  "roleBasedAccess",
  "sessionTimeout",
];

const convertValue = (key, value) => {
  if (booleanKeys.includes(key)) {
    return value === true || value === "true" || value === "1";
  }

  if (key === "maxBorrowingDays") {
    const days = Number(value);

    if (Number.isInteger(days) && days >= 1 && days <= 365) {
      return days;
    }

    return policyDefaults.maxBorrowingDays;
  }

  return value || "";
};

const readSettings = async () => {
  const [rows] = await pool.query(
    "SELECT setting_key, setting_value FROM system_settings"
  );

  const settings = { ...defaultSettings };

  rows.forEach((row) => {
    if (
      Object.prototype.hasOwnProperty.call(
        defaultSettings,
        row.setting_key
      )
    ) {
      settings[row.setting_key] = convertValue(
        row.setting_key,
        row.setting_value
      );
    }
  });

  return settings;
};

const selectKeys = (settings, keys) => {
  const result = {};

  keys.forEach((key) => {
    result[key] = settings[key];
  });

  return result;
};

// GET /api/system-settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await readSettings();

    res.status(200).json(settings);
  } catch (error) {
    console.error("Get system settings error:", error.message);

    res.status(500).json({
      message: "Failed to load system settings.",
    });
  }
};

// PUT /api/system-settings
exports.updateSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const suppliedKeys = Object.keys(body);

    const validKeys = Object.keys(defaultSettings);
    const invalidKey = suppliedKeys.some(
      (key) => !validKeys.includes(key)
    );

    if (suppliedKeys.length === 0 || invalidKey) {
      return res.status(400).json({
        message: "Please provide valid settings to save.",
      });
    }

    // Find which section the submitted settings belong to.
    let selectedSection = null;

    for (const section of Object.keys(sectionKeys)) {
      const keys = sectionKeys[section];

      if (
        suppliedKeys.every((key) => keys.includes(key)) &&
        keys.every((key) => suppliedKeys.includes(key))
      ) {
        selectedSection = section;
        break;
      }
    }

    if (!selectedSection) {
      return res.status(400).json({
        message: "Save one settings section at a time.",
      });
    }

    const keys = sectionKeys[selectedSection];
    const newSettings = {};

    // Validate General Profile
    if (selectedSection === "general") {
      for (const key of keys) {
        if (
          body[key] === undefined ||
          body[key] === null ||
          String(body[key]).trim() === ""
        ) {
          return res.status(400).json({
            message: "Please complete all General Profile fields.",
          });
        }

        newSettings[key] = String(body[key]).trim();
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(newSettings.contactEmail)) {
        return res.status(400).json({
          message: "Please enter a valid contact email.",
        });
      }
    }

    // Validate Borrowing Policies
    if (selectedSection === "policies") {
      for (const key of ["autoDetectConflicts", "requireInspection"]) {
        if (typeof body[key] !== "boolean") {
          return res.status(400).json({
            message: "Invalid Borrowing Policies setting.",
          });
        }

        newSettings[key] = body[key];
      }

      const days = Number(body.maxBorrowingDays);

      if (!Number.isInteger(days) || days < 1 || days > 365) {
        return res.status(400).json({
          message: "Maximum borrowing days must be between 1 and 365.",
        });
      }

      newSettings.maxBorrowingDays = days;
    }

    // Validate Notification Rules and Security & Access
    if (
      selectedSection === "notifications" ||
      selectedSection === "security"
    ) {
      for (const key of keys) {
        if (typeof body[key] !== "boolean") {
          return res.status(400).json({
            message: "Please provide valid on/off settings.",
          });
        }

        newSettings[key] = body[key];
      }
    }

    const oldSettings = await readSettings();

    // Save only the selected section's settings
    for (const key of keys) {
      await pool.query(
        `INSERT INTO system_settings
          (setting_key, setting_value, updated_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value),
          updated_by = VALUES(updated_by)`,
        [key, String(newSettings[key]), req.user.id]
      );
    }

    const sectionNames = {
      general: "General Profile Settings Updated",
      policies: "Borrowing Policies Updated",
      notifications: "Notification Rules Updated",
      security: "Security & Access Settings Updated",
    };

    await saveAuditLog(
      req,
      sectionNames[selectedSection],
      "system_settings",
      null,
      selectKeys(oldSettings, keys),
      newSettings
    );

    const updatedSettings = await readSettings();

    const messages = {
      general: "General Profile settings saved successfully.",
      policies: "Borrowing Policies saved successfully.",
      notifications: "Notification Rules saved successfully.",
      security: "Security & Access settings saved successfully.",
    };

    res.status(200).json({
      message: messages[selectedSection],
      settings: updatedSettings,
    });
  } catch (error) {
    console.error("Update system settings error:", error.message);

    res.status(500).json({
      message: "Failed to save system settings.",
    });
  }
};
