const express = require("express");

const {
  getUsers,
  createUser,
  getUserById,
  getUserTasks,
  deleteUser,
  resetUserPassword,
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
// CREATE USER / ADMIN
// Admin only
// ==========================================

router.post(
  "/",
  authorize("admin"),
  createUser
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

// ==========================================
// DELETE USER
// Admin only
// ==========================================

router.delete(
  "/:id",
  authorize("admin"),
  deleteUser
);

// ==========================================
// RESET USER PASSWORD
// Admin only
// ==========================================

router.put(
  "/:id/reset-password",
  authorize("admin"),
  resetUserPassword
);

module.exports = router;