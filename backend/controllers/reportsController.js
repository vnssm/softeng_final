const pool = require("../config/db");

// Get report data for the admin Reports page
exports.getReports = async (req, res) => {
  try {
    const timeRange = req.query.range || "Last 30 Days";

    // Set the start date based on the selected time range
    const today = new Date();
    let startDate = new Date(today);

    if (timeRange === "Last 7 Days") {
      startDate.setDate(today.getDate() - 6);
    } else if (timeRange === "Last 30 Days") {
      startDate.setDate(today.getDate() - 29);
    } else if (timeRange === "Last 90 Days") {
      startDate.setDate(today.getDate() - 89);
    } else if (timeRange === "This Year") {
      startDate = new Date(today.getFullYear(), 0, 1);
    } else {
      return res.status(400).json({
        message: "Invalid report time range.",
      });
    }

    const formattedStartDate = startDate.toISOString().slice(0, 10);

    // 1. Most borrowed equipment
    const [equipmentData] = await pool.query(
      `SELECT e.name, SUM(ri.quantity) AS count
       FROM request_items ri
       INNER JOIN requests r ON ri.request_id = r.id
       INNER JOIN equipment e ON ri.equipment_id = e.id
       WHERE r.created_at >= ?
         AND r.request_type = 'equipment'
         AND r.status <> 'cancelled'
       GROUP BY e.id, e.name
       ORDER BY count DESC
       LIMIT 5`,
      [formattedStartDate]
    );

    // 2. Most reserved facilities
    const [facilityData] = await pool.query(
      `SELECT f.name, COUNT(r.id) AS count
       FROM requests r
       INNER JOIN facilities f ON r.facility_id = f.id
       WHERE r.created_at >= ?
         AND r.request_type = 'facility'
         AND r.status <> 'cancelled'
       GROUP BY f.id, f.name
       ORDER BY count DESC
       LIMIT 5`,
      [formattedStartDate]
    );

    // 3. Reservation trends
    let trendFormat = "%Y-%m";

    if (timeRange === "Last 7 Days" || timeRange === "Last 30 Days") {
      trendFormat = "%Y-%m-%d";
    }

    const [trendData] = await pool.query(
      `SELECT
         DATE_FORMAT(created_at, ?) AS period,
         COUNT(*) AS val
       FROM requests
       WHERE created_at >= ?
         AND status <> 'cancelled'
       GROUP BY period
       ORDER BY period ASC`,
      [trendFormat, formattedStartDate]
    );

    res.json({
      equipmentData,
      facilityData,
      trendData,
    });
  } catch (error) {
    console.error("Get reports error:", error);

    res.status(500).json({
      message: "Failed to retrieve report data.",
    });
  }
};