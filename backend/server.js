const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const facilityRoutes = require("./routes/facilityRoutes");
const borrowingRoutes = require("./routes/borrowingRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const activityRoutes = require("./routes/activityRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const profileRoutes = require("./routes/profileRoutes");
const personnelRequestRoutes = require("./routes/personnelRequestRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const userRoutes = require("./routes/userRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const auditLogsRoutes = require("./routes/auditLogsRoutes");
const systemSettingsRoutes = require("./routes/systemSettingsRoutes");

const app = express();

const path = require("path");

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// Middleware

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/facilities", facilityRoutes);
app.use("/api/borrowing", borrowingRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/requests", personnelRequestRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/audit-logs", auditLogsRoutes);
app.use("/api/system-settings", systemSettingsRoutes);
// Test route
app.get("/", (req, res) => {
  res.send("GSD Backend is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});