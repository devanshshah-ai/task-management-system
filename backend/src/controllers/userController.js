const mongoose = require("mongoose");

const User = require("../models/User");
const Task = require("../models/Task");
const AppError = require("../utils/AppError");

// ==========================================
// GET ALL USERS
// Admin only through route middleware
// ==========================================

const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        users,
        count: users.length,
      },
    });
  } catch (error) {
    throw error;
  }
};

// ==========================================
// GET USER BY ID
// Admin -> any user
// User  -> own profile only
// ==========================================

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user ID", 400);
    }

    // User can only access their own profile
    if (
      req.user.role === "user" &&
      req.user.userId.toString() !== id.toString()
    ) {
      throw new AppError("User not found", 404);
    }

    const user = await User.findById(id).select("-password");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    throw error;
  }
};

// ==========================================
// GET USER TASKS
// Admin -> any user's tasks
// User  -> own tasks only
// ==========================================

const getUserTasks = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user ID", 400);
    }

    // User can only access their own tasks
    if (
      req.user.role === "user" &&
      req.user.userId.toString() !== id.toString()
    ) {
      throw new AppError("User not found", 404);
    }

    const user = await User.findById(id)
      .select("_id name email role");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const tasks = await Task.find({
      assignedTo: id,
    })
      .populate("createdBy", "name email role")
      .sort({ dueDate: 1 });

    return res.status(200).json({
      success: true,
      data: {
        user,
        tasks,
        count: tasks.length,
      },
    });
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getUsers,
  getUserById,
  getUserTasks,
};