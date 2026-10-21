
const db = require("../config/db");

const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/profiles");

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const userId = req.user.id || req.user.userId;
    const fileName = "profile_" + userId + fileExtension;

    cb(null, fileName);
  }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 2 * 1024 * 1024 
    }, // Limit file size to 5MB);
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed!"));
        }
    }
});

exports.uploadProfilePicture = [
    upload.single("profile_image"),

    async (req, res) => {
        const userId = req.user.id || req.user.userId;

        if (!req.file) {
            return res.status(400).json({ message: "Please select a profile picture." });
        }

        try {
            const imagePath = "/uploads/profiles/" + req.file.filename;  
            const connection = await db.getConnection();

            try {
                await connection.beginTransaction();
                await connection.query(
                    "UPDATE users SET profile_image = ? WHERE id = ?",
                    [imagePath, userId]
                );
                await connection.query(
                    `INSERT INTO activity_logs
                     (user_id, action_type, description, related_type, related_id)
                     VALUES (?, ?, ?, ?, ?)`,
                    [userId, "profile_picture_update", "Changed the account profile picture", "user", userId]
                );
                await connection.commit();
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }

            return res.status(200).json({ message: "Profile picture updated successfully.", profile_image: imagePath  });
        } catch (error) {
            console.error("Update profile picture error:", error);
            return res.status(500).json({ message: "Failed to update profile picture."});
        }
    }
];

// Get the logged-in borrower's profile
exports.getMyProfile = async (req, res) => {
  const userId = req.user.id || req.user.userId;

  if (!userId) {
    return res.status(401).json({
      message: "User information is missing. Please log in again."
    });
  }

  try {
    // Get user details
    const [userRows] = await db.query(
      `SELECT
         id,
         first_name,
         last_name,
         email,
         student_id,
         employee_id,
         role,
         college_department,
         contact_number,
         profile_image,
         created_at,
         last_login_at
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        message: "User profile not found."
      });
    }

    // Get equipment borrowing requests
    const [equipmentRows] = await db.query(
      `SELECT
         r.id AS request_id,
         r.request_code,
         e.name AS equipment_name,
         ri.quantity,
         r.date_needed,
         r.date_end,
         r.time_start,
         r.time_end,
         r.status,
         r.created_at
       FROM requests r
       INNER JOIN request_items ri
         ON r.id = ri.request_id
       INNER JOIN equipment e
         ON ri.equipment_id = e.id
       WHERE r.user_id = ?
         AND r.request_type = 'equipment'
       ORDER BY r.created_at DESC`,
      [userId]
    );

    // Get facility reservations
    const [facilityRows] = await db.query(
      `SELECT
         r.id AS request_id,
         r.request_code,
         f.name AS facility_name,
         r.date_needed,
         r.date_end,
         r.time_start,
         r.time_end,
         r.status,
         r.created_at
       FROM requests r
       INNER JOIN facilities f
         ON r.facility_id = f.id
       WHERE r.user_id = ?
         AND r.request_type = 'facility'
       ORDER BY r.created_at DESC`,
      [userId]
    );

    // Include audited staff actions as well as borrower activity entries.
    const [activityRows] = await db.query(
      `SELECT action_type, description, created_at
       FROM (
         SELECT id, action_type, description, created_at
         FROM activity_logs
         WHERE user_id = ?

         UNION ALL

         SELECT id,
                action AS action_type,
                CASE
                  WHEN table_name IS NULL THEN action
                  WHEN record_id IS NULL THEN CONCAT(action, ' (', table_name, ')')
                  ELSE CONCAT(action, ' (', table_name, ' #', record_id, ')')
                END AS description,
                created_at
         FROM audit_logs
         WHERE user_id = ?
           AND action NOT IN (
             'User Login',
             'User Logout',
             'Failed Login Attempt'
           )

         UNION ALL

         SELECT r.id,
                'request_approved' AS action_type,
                CONCAT('Approved request ', r.request_code) AS description,
                COALESCE(r.approved_at, r.updated_at) AS created_at
         FROM requests r
         WHERE r.approved_by = ?
           AND NOT EXISTS (
             SELECT 1
             FROM activity_logs a
             WHERE a.user_id = ?
               AND a.action_type = 'request_approved'
               AND a.related_type = 'request'
               AND a.related_id = r.id
           )

         UNION ALL

         SELECT r.id,
                'return_inspected' AS action_type,
                CONCAT('Inspected the return for request ', r.request_code) AS description,
                COALESCE(r.returned_at, r.updated_at) AS created_at
         FROM requests r
         WHERE r.inspected_by = ?
           AND NOT EXISTS (
             SELECT 1
             FROM activity_logs a
             WHERE a.user_id = ?
               AND a.action_type = 'return_inspected'
               AND a.related_type = 'request'
               AND a.related_id = r.id
           )
       ) AS recent_activities
       ORDER BY created_at DESC, id DESC
       LIMIT 5`,
      [userId, userId, userId, userId, userId, userId]
    );

    return res.status(200).json({
      user: userRows[0],
      equipment: equipmentRows,
      facilities: facilityRows,
      activities: activityRows
    });

  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Failed to load profile."
    });
  }
};


 // Update the logged-in borrower's profile
exports.updateMyProfile = async (req, res) => {
  const userId = req.user.id || req.user.userId;

  const {
    first_name,
    last_name,
    email,
    contact_number,
    college_department
  } = req.body;

  if (!userId) {
    return res.status(401).json({
      message: "User information is missing. Please log in again."
    });
  }

  if (
    !first_name ||
    !first_name.trim() ||
    !last_name ||
    !last_name.trim() ||
    !email ||
    !email.trim()
  ) {
    return res.status(400).json({
      message: "First name, last name, and email are required."
    });
  }

  let connection;

  try {
    // Check whether another user already uses this email
    const [existingUsers] = await db.query(
      `SELECT id
       FROM users
       WHERE email = ? AND id != ?`,
      [email.trim(), userId]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "This email address is already being used."
      });
    }

    // Update only the logged-in user's information
    // Choose the correct ID field based on the user's role
const userIdField =
  req.user.role === "borrower" ? "student_id" : "employee_id";

const userIdValue =
  req.user.role === "borrower"
    ? req.body.student_id
    : req.body.employee_id;

// Update the user's profile
    connection = await db.getConnection();
    await connection.beginTransaction();
    await connection.query(
        `UPDATE users
        SET first_name = ?,
            last_name = ?,
            email = ?,
            ${userIdField} = ?,
            contact_number = ?,
            college_department = ?
        WHERE id = ?`,
        [
            first_name.trim(),
            last_name.trim(),
            email.trim(),
            userIdValue ? userIdValue.trim() : null,
            contact_number ? contact_number.trim() : null,
            college_department ? college_department.trim() : null,
            userId
        ]
    );
    await connection.query(
      `INSERT INTO activity_logs
       (user_id, action_type, description, related_type, related_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, "profile_update", "Updated account profile details", "user", userId]
    );
    await connection.commit();

    return res.status(200).json({
      message: "Profile updated successfully."
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Update profile error:", error);

    return res.status(500).json({
      message: "Failed to update profile."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
