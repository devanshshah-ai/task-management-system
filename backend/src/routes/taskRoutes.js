const express = require("express");

const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
} = require("../controllers/taskController");

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

// Admin only
router.post(
  "/",
  authorize("admin"),
  createTask
);

// Admin + User
router.get(
  "/",
  authorize("admin", "user"),
  getTasks
);

// Admin only
router.get(
  "/stats",
  authorize("admin"),
  getTaskStats
);

// Admin + User
router.get(
  "/:id",
  authorize("admin", "user"),
  getTaskById
);

// Admin + User
router.put(
  "/:id",
  authorize("admin", "user"),
  updateTask
);

// Admin + User
router.delete(
  "/:id",
  authorize("admin", "user"),
  deleteTask
);

module.exports = router;