const bcrypt = require("bcryptjs");
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

const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Basic validation
    if (!name || !email || !password || !role) {
      throw new AppError(
        "Name, email, password and role are required",
        400
      );
    }

    // Validate role
    if (!["user", "admin"].includes(role)) {
      throw new AppError(
        "Role must be either user or admin",
        400
      );
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingUser) {
      throw new AppError(
        "An account with this email already exists",
        409
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
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

// ==========================================
// DELETE USER
// Admin only
// ==========================================

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user ID", 400);
    }

    // Prevent admin from deleting themselves
    if (req.user.userId.toString() === id.toString()) {
      throw new AppError(
        "You cannot delete your own account",
        400
      );
    }

    const user = await User.findById(id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Optional safety rule:
    // Don't allow deleting an admin from this page.
    // Remove this block if admins should be deletable.
    if (user.role === "admin") {
      throw new AppError(
        "Administrator accounts cannot be deleted",
        400
      );
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    throw error;
  }
};


// ==========================================
// RESET USER PASSWORD
// Admin only
// ==========================================

const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;

    let { password } = req.body;

    if (
      typeof password === "object" &&
      password !== null
    ) {
      password = password.password;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(
        "Invalid user ID",
        400
      );
    }

    if (
      typeof password !== "string" ||
      password.trim().length < 6
    ) {
      throw new AppError(
        "Password must be at least 6 characters long",
        400
      );
    }

    const user = await User.findById(id);

    if (!user) {
      throw new AppError(
        "User not found",
        404
      );
    }

    const hashedPassword = await bcrypt.hash(
      password.trim(),
      12
    );

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getUsers,
  createUser,
  getUserById,
  getUserTasks,
  deleteUser,
  resetUserPassword,
};