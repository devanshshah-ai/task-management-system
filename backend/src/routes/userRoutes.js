const express = require("express");

const {
  getUsers,
  getUserById,
  getUserTasks,
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

// ==========================================
// GET ALL USERS
// Admin only
// ==========================================

router.get(
  "/",
  authorize("admin"),
  getUsers
);

// ==========================================
// GET USER TASKS
// Admin -> any user
// User  -> own tasks only
// ==========================================

router.get(
  "/:id/tasks",
  authorize("admin", "user"),
  getUserTasks
);

// ==========================================
// GET USER BY ID
// Admin -> any user
// User  -> own profile only
// ==========================================

router.get(
  "/:id",
  authorize("admin", "user"),
  getUserById
);

module.exports = router;