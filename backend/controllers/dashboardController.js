const pool = require("../config/db");

// ======================
// BORROWER DASHBOARD
// ======================

// ======================
// BORROWER DASHBOARD
// ======================
exports.getBorrowerDashboard = async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "User information is missing. Please log in again."
      });
    }

    // Update overdue equipment requests
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
      `SELECT COUNT(*) AS count
       FROM requests r
       WHERE r.user_id = ?
         AND r.request_type = 'facility'
         AND r.status = 'pending'
         AND NOT EXISTS (
           SELECT 1
           FROM transaction_removals tr
           WHERE tr.request_id = r.id
         )`,
      [userId]
    );

    // 3. Active Borrowings (equipment)
    const [activeBorrowings] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests r
       WHERE r.user_id = ?
         AND r.request_type = 'equipment'
         AND LOWER(r.status) IN (
           'approved',
           'for_delivery',
           'for_pickup',
           'ongoing'
         )
         AND NOT EXISTS (
           SELECT 1
           FROM transaction_removals tr
           WHERE tr.request_id = r.id
         )`,
      [userId]
    );

    // 4. Active Reservations (facility)
    const [activeReservations] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests r
       WHERE r.user_id = ?
         AND r.request_type = 'facility'
         AND LOWER(r.status) IN ('approved', 'ongoing')
         AND NOT EXISTS (
           SELECT 1
           FROM transaction_removals tr
           WHERE tr.request_id = r.id
         )`,
      [userId]
    );

    // 5. Upcoming approved facility reservations only
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
         f.name AS facility_name
       FROM requests r
       LEFT JOIN facilities f ON f.id = r.facility_id
       WHERE r.user_id = ?
         AND r.request_type = 'facility'
         AND r.status IN ('approved', 'ongoing')
         AND COALESCE(r.date_end, r.date_needed) >= CURDATE()
         AND NOT EXISTS (
           SELECT 1
           FROM transaction_removals tr
           WHERE tr.request_id = r.id
         )
       ORDER BY r.date_needed ASC, r.time_start ASC`,
      [userId]
    );

    // 6. Request Progress (excluding removed transactions)
    const [requestProgress] = await pool.query(
      `SELECT
         r.id,
         r.request_code,
         r.request_type,
         r.status,
         r.created_at,
         r.updated_at,
         r.completed_at
       FROM requests r
       WHERE r.user_id = ?
         AND NOT EXISTS (
           SELECT 1
           FROM transaction_removals tr
           WHERE tr.request_id = r.id
         )
         AND NOT (
           r.status IN (
             'rejected',
             'completed',
             'completed_with_issue'
           )
           AND (
             (
               r.status = 'rejected'
               AND r.updated_at <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
             )
             OR
             (
               r.status IN ('completed', 'completed_with_issue')
               AND r.completed_at IS NOT NULL
               AND r.completed_at <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
             )
           )
         )
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      stats: {
        pendingRequests: pendingRequests[0].count,
        pendingReservations: pendingReservations[0].count,
        activeBorrowings: activeBorrowings[0].count,
        activeReservations: activeReservations[0].count
      },
      upcomingReservations: upcoming,
      requestProgress
    });

  } catch (error) {
    console.error("Borrower Dashboard error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


// ======================
// PERSONNEL DASHBOARD
// ======================

exports.getPersonnelDashboard = async (req, res) => {
  try {
    const personnelId = req.user?.id ?? req.user?.userId;

    if (!personnelId) {
      return res.status(401).json({
        message: "User information is missing. Please log in again."
      });
    }

    // Update overdue transactions, excluding removed transactions
    await pool.query(
      `UPDATE requests r
       SET r.status = 'overdue'
       WHERE r.status IN (
         'approved',
         'for_delivery',
         'for_pickup',
         'ongoing'
       )
       AND r.date_end IS NOT NULL
       AND r.time_end IS NOT NULL
       AND TIMESTAMP(r.date_end, r.time_end) < NOW()
       AND NOT EXISTS (
         SELECT 1
         FROM transaction_removals tr
         WHERE tr.request_id = r.id
       )`
    );

    // 1. Pending Transactions
    const [pending] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests r
       WHERE LOWER(r.status) IN ('pending', 'under_review')
         AND NOT EXISTS (
           SELECT 1
           FROM transaction_removals tr
           WHERE tr.request_id = r.id
         )`
    );

    // 2. Approved Transactions
    const [approved] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests r
       WHERE LOWER(r.status) IN (
         'approved',
         'for_delivery',
         'for_pickup',
         'ongoing'
       )
       AND NOT EXISTS (
         SELECT 1
         FROM transaction_removals tr
         WHERE tr.request_id = r.id
       )`
    );

    // 3. Returned and Completed Transactions
    const [returns] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests r
       WHERE LOWER(r.status) IN (
         'returned',
         'completed',
         'completed_with_issue'
       )
       AND NOT EXISTS (
         SELECT 1
         FROM transaction_removals tr
         WHERE tr.request_id = r.id
       )`
    );

    // 4. Overdue Transactions
    const [overdue] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests r
       WHERE LOWER(r.status) = 'overdue'
         AND NOT EXISTS (
           SELECT 1
           FROM transaction_removals tr
           WHERE tr.request_id = r.id
         )`
    );

    // 5. Today's pickup and delivery tasks
    const [todayTasks] = await pool.query(
      `SELECT
         a.id,
         a.assignment_type,
         a.scheduled_time,
         a.location,
         r.request_code,
         r.fulfillment_type,
         r.status
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
         AND NOT EXISTS (
           SELECT 1
           FROM transaction_removals tr
           WHERE tr.request_id = r.id
         )
       ORDER BY a.scheduled_time ASC
       LIMIT 10`,
      [personnelId]
    );

    // 6. Recent Transactions
    const [recentRequests] = await pool.query(
      `SELECT
         r.id,
         r.request_code,
         r.status,
         r.created_at,
         CONCAT(u.first_name, ' ', u.last_name) AS requester,
         u.college_department
       FROM requests r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE NOT EXISTS (
         SELECT 1
         FROM transaction_removals tr
         WHERE tr.request_id = r.id
       )
       ORDER BY r.created_at DESC
       LIMIT 5`
    );

    return res.status(200).json({
      stats: {
        pending: pending[0].count,
        approved: approved[0].count,
        returns: returns[0].count,
        overdue: overdue[0].count
      },
      todayTasks,
      recentRequests
    });

  } catch (error) {
    console.error("Personnel Dashboard error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};




exports.getAdminDashboard = async (req, res) => {
  try {
    // 1. Count active user accounts
    const [users] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM users
       WHERE is_active = 1`
    );

    // 2. Count registered active equipment
    const [equipment] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM equipment
       WHERE is_active = 1`
    );

    // 3. Count transactions excluding removed transactions
    const [transactions] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests r
       WHERE NOT EXISTS (
         SELECT 1
         FROM transaction_removals tr
         WHERE tr.request_id = r.id
       )`
    );

    // 4. Count registered active facilities
    const [facilities] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM facilities
       WHERE is_active = 1`
    );

    // 5. Count active equipment borrowings
    const [activeBorrowings] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests r
       WHERE r.request_type = 'equipment'
         AND r.status IN (
           'approved',
           'for_delivery',
           'for_pickup',
           'ongoing'
         )
         AND NOT EXISTS (
           SELECT 1
           FROM transaction_removals tr
           WHERE tr.request_id = r.id
         )`
    );

    // 6. Count upcoming approved facility reservations
    const [upcomingReservations] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests r
       WHERE r.request_type = 'facility'
         AND r.status = 'approved'
         AND r.date_needed >= CURDATE()
         AND NOT EXISTS (
           SELECT 1
           FROM transaction_removals tr
           WHERE tr.request_id = r.id
         )`
    );

    // 7. Count overdue transactions
    const [overdue] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM requests r
       WHERE LOWER(r.status) = 'overdue'
         AND NOT EXISTS (
           SELECT 1
           FROM transaction_removals tr
           WHERE tr.request_id = r.id
         )`
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
    return res.status(200).json({
      stats: {
        totalUsers: users[0].count,
        totalEquipment: equipment[0].count,
        totalTransactions: transactions[0].count,
        totalFacilities: facilities[0].count
      },
      systemOverview: {
        activeBorrowings: activeBorrowings[0].count,
        upcomingReservations: upcomingReservations[0].count,
        overdueTransactions: overdue[0].count
      },
      systemActivity: activities
    });

  } catch (error) {
    console.error("Admin Dashboard error:", error);

    res.status(500).json({
      message: "Failed to load admin dashboard"
    });
  }
};

