const express = require("express");

const {
  getUsers,
  getUserById,
  getUserTasks,
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getUsers);
router.get("/:id/tasks", getUserTasks);
router.get("/:id", getUserById);

module.exports = router;