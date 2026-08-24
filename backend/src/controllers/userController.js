const User = require("../models/User");
const Task = require("../models/Task");

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
    console.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching users",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching the user",
    });
  }
};

const getUserTasks = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("_id name email role");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
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
    console.error("Get user tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching user tasks",
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  getUserTasks,
};