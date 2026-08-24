const express = require("express");

const {
  registerUser,
  login,
  getCurrentUser,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", login);
// Protected routes
router.get("/me", protect, getCurrentUser);

module.exports = router;