const pool = require("../config/db");

// ======================
// BORROWER DASHBOARD
// ======================
exports.getBorrowerDashboard = async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "User information is missing. Please log in again." });
    }

    await pool.query(
      `UPDATE requests
      SET status = 'overdue'
      WHERE request_type = 'equipment'
        AND status IN (
          'approved',
          'for_delivery',
          'for_pickup',
          'ongoing'
        )
        AND date_end IS NOT NULL
        AND time_end IS NOT NULL
        AND TIMESTAMP(date_end, time_end) < NOW()`
    );

    // 1. Pending Requests (equipment)
    // 1. Pending Requests (equipment, excluding removed transactions)
const [pendingRequests] = await pool.query(
  `SELECT COUNT(*) AS count
   FROM requests r
   WHERE r.user_id = ?
     AND r.request_type = 'equipment'
     AND r.status = 'pending'
     AND NOT EXISTS (
       SELECT 1
       FROM transaction_removals tr
       WHERE tr.request_id = r.id
     )`,
  [userId]
);

    // 2. Pending Reservations (facility)
    const [pendingReservations] = await pool.query(
      `SELECT COUNT(*) AS count FROM requests 
       WHERE user_id = ? AND request_type = 'facility' AND status = 'pending'`,
      [userId]
    );

    // 3. Active Borrowings (equipment that is approved / ongoing)
    const [activeBorrowings] = await pool.query(
      `SELECT COUNT(*) AS count FROM requests 
       WHERE user_id = ? AND request_type = 'equipment' 
       AND LOWER(status) IN ('approved', 'for_delivery', 'for_pickup', 'ongoing')`,
      [userId]
    );

    // 4. Active Reservations (facility that is approved / ongoing)
    const [activeReservations] = await pool.query(
      `SELECT COUNT(*) AS count FROM requests 
       WHERE user_id = ? AND request_type = 'facility' 
       AND LOWER(status) IN ('approved', 'ongoing')`,
      [userId]
    );

// 5. Upcoming Reservations and Active Borrowings (Facilities & Equipment)
    const [upcoming] = await pool.query(
      `SELECT
        r.id,
        r.request_code,
        r.date_needed,
        r.date_end,
        r.time_start,
        r.time_end,
        r.status,
        r.request_type,
        COALESCE(
          f.name, 
          (SELECT GROUP_CONCAT(e.name SEPARATOR ', ') 
           FROM request_items ri 
           JOIN equipment e ON e.id = ri.equipment_id 
           WHERE ri.request_id = r.id),
          'Equipment Request'
        ) AS facility_name
      FROM requests r
      LEFT JOIN facilities f ON f.id = r.facility_id
      WHERE r.user_id = ?
        AND r.status IN ('approved', 'for_delivery', 'for_pickup', 'ongoing')
        AND COALESCE(r.date_end, r.date_needed) >= CURDATE()
      ORDER BY r.date_needed ASC, r.time_start ASC`,
      [userId]
    );

    // 6. Request progress (all requests belonging to this borrower)
    const [requestProgress] = await pool.query(
      `SELECT id, request_code, request_type, status, created_at,
              updated_at, completed_at
      FROM requests
      WHERE user_id = ?
        AND NOT (
          status IN ('rejected', 'completed', 'completed_with_issue')
          AND (
            (status = 'rejected'
              AND updated_at <= DATE_SUB(NOW(), INTERVAL 24 HOUR))
            OR
            (status IN ('completed', 'completed_with_issue')
              AND completed_at IS NOT NULL
              AND completed_at <= DATE_SUB(NOW(), INTERVAL 24 HOUR))
          )
        )
      ORDER BY created_at DESC`,
      [userId]
    );

    res.status(200).json({
      stats: {
        pendingRequests: pendingRequests[0].count,
        pendingReservations: pendingReservations[0].count,
        activeBorrowings: activeBorrowings[0].count,
        activeReservations: activeReservations[0].count,
      },
      upcomingReservations: upcoming,
      requestProgress: requestProgress,
    });
  } catch (error) {
    console.error("Borrower Dashboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// PERSONNEL DASHBOARD
// ======================
exports.getPersonnelDashboard = async (req, res) => {
  try {
    const personnelId = req.user?.id ?? req.user?.userId;

    if (!personnelId) {
      return res.status(401).json({ message: "User information is missing. Please log in again." });
    }

    await pool.query(
      `UPDATE requests
       SET status = 'overdue'
       WHERE status IN (
         'approved',
         'for_delivery',
         'for_pickup',
         'ongoing'
       )
       AND date_end IS NOT NULL
       AND time_end IS NOT NULL
       AND TIMESTAMP(date_end, time_end) < NOW()`
    );
    // 1. Stats
    const [pending] = await pool.query(
      `SELECT COUNT(*) AS count FROM requests WHERE LOWER(status) IN ('pending', 'under_review')`
    );

    const [approved] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE LOWER(status) IN ('approved', 'for_delivery', 'for_pickup', 'ongoing')`
    );

    const [returns] = await pool.query(
      `SELECT COUNT(*) AS count FROM requests WHERE LOWER(status) IN ('returned', 'completed', 'completed_with_issue')`
    );

    const [overdue] = await pool.query(
      `SELECT COUNT(*) AS count FROM requests WHERE LOWER(status) = 'overdue'`
    );

    // 2. Today's active pickup and delivery tasks for this personnel
    const [todayTasks] = await pool.query(
      `SELECT a.id, a.assignment_type, a.scheduled_time, a.location,
              r.request_code, r.fulfillment_type, r.status
       FROM assignments a
       INNER JOIN requests r ON r.id = a.request_id
       WHERE a.personnel_id = ?
         AND LOWER(COALESCE(
           NULLIF(TRIM(r.fulfillment_type), ''),
           TRIM(a.assignment_type)
         )) IN ('pickup', 'delivery')
         AND (
           DATE(a.scheduled_time) = CURDATE()
           OR DATE(r.date_needed) = CURDATE()
         )
       ORDER BY a.scheduled_time ASC
       LIMIT 10`,
      [personnelId]
    );

    // 3. Recent Requests (latest pending/approved)
    const [recentRequests] = await pool.query(
      `SELECT r.id, r.request_code, r.status, r.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS requester,
              u.college_department
       FROM requests r
       LEFT JOIN users u ON u.id = r.user_id
       ORDER BY r.created_at DESC
       LIMIT 5`
    );

    res.status(200).json({
      stats: {
        pending: pending[0].count,
        approved: approved[0].count,
        returns: returns[0].count,
        overdue: overdue[0].count,
      },
      todayTasks,
      recentRequests,
    });
  } catch (error) {
    console.error("Personnel Dashboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getAdminDashboard = async (req, res) => {
  try {
    // 1. Count active user accounts
    const [users] = await pool.query(
      "SELECT COUNT(*) AS count FROM users WHERE is_active = 1"
    );

    // 2. Count registered equipment
    const [equipment] = await pool.query(
      "SELECT COUNT(*) AS count FROM equipment"
    );

    // 3. Count all transactions
    const [transactions] = await pool.query(
      "SELECT COUNT(*) AS count FROM requests"
    );

    // 4. Count registered facilities
    const [facilities] = await pool.query(
      "SELECT COUNT(*) AS count FROM facilities"
    );

    // 5. Count active equipment borrowings
    const [activeBorrowings] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE request_type = 'equipment'
       AND status IN ('for_delivery', 'for_pickup', 'ongoing')`
    );

    // 6. Count upcoming approved facility reservations
    const [upcomingReservations] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE request_type = 'facility'
       AND status = 'approved'
       AND date_needed >= CURDATE()`
    );

    // 7. Count overdue transactions
    const [overdue] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE LOWER(status) = 'overdue'`
    );

    // 8. Get recent system activities
    const [activities] = await pool.query(
      `SELECT
         a.id,
         CONCAT(
           COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'System'),
           ': ',
           a.description
         ) AS title,
         DATE_FORMAT(
           a.created_at,
           '%b %d, %Y %h:%i %p'
         ) AS time
       FROM activity_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT 10`
    );

    // 9. Send dashboard data to the frontend
    res.status(200).json({
      stats: {
        totalUsers: users[0].count,
        totalEquipment: equipment[0].count,
        totalTransactions: transactions[0].count,
        totalFacilities: facilities[0].count,
      },
      systemOverview: {
        activeBorrowings: activeBorrowings[0].count,
        upcomingReservations: upcomingReservations[0].count,
        overdueTransactions: overdue[0].count,
      },
      systemActivity: activities,
    });

  } catch (error) {
    console.error("Admin Dashboard error:", error);

    res.status(500).json({
      message: "Failed to load admin dashboard",
    });
  }
};
