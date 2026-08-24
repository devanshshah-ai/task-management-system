const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const app = express();
app.use(cors());
app.use(express.json());
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Task Management API is running",
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
module.exports = app;