const express = require("express");

const {
  registerAdmin,
  loginAdmin,
  getCurrentUser,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

// Protected routes
router.get("/me", protect, getCurrentUser);

module.exports = router;