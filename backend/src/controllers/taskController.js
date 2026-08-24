const mongoose = require("mongoose");

const Task = require("../models/Task");
const User = require("../models/User");

const {
  createTaskSchema,
  updateTaskSchema,
} = require("../validators/taskValidator");


// CREATE TASK
const createTask = async (req, res) => {
  try {
    const validationResult = createTaskSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
    }

    const {
      title,
      description,
      priority,
      status,
      dueDate,
      assignedTo,
    } = validationResult.data;

    // Check assigned user exists
    const assignedUser = await User.findById(assignedTo);

    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        message: "Assigned user not found",
      });
    }

    const task = await Task.create({
      title,
      description,
      priority,
      status,
      dueDate,
      assignedTo,
      createdBy: req.user.userId,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: {
        task: populatedTask,
      },
    });
  } catch (error) {
    console.error("Create task error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the task",
    });
  }
};


// GET ALL TASKS
const getTasks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      priority,
      sortBy = "dueDate",
      sortOrder = "asc",
    } = req.query;

    const currentPage = Math.max(Number(page), 1);
    const pageLimit = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (currentPage - 1) * pageLimit;

    const query = {};

    // Search by title
    if (search.trim()) {
      query.title = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by priority
    if (priority) {
      query.priority = priority;
    }

    // Sorting
    const allowedSortFields = [
      "dueDate",
      "createdAt",
      "updatedAt",
      "title",
      "priority",
      "status",
    ];

    const selectedSortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : "dueDate";

    const selectedSortOrder = sortOrder === "desc" ? -1 : 1;

    const sort = {
      [selectedSortField]: selectedSortOrder,
    };

    const [tasks, totalTasks] = await Promise.all([
      Task.find(query)
        .populate("assignedTo", "name email role")
        .populate("createdBy", "name email role")
        .sort(sort)
        .skip(skip)
        .limit(pageLimit),

      Task.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalTasks / pageLimit);

    return res.status(200).json({
      success: true,
      data: {
        tasks,
        pagination: {
          currentPage,
          totalPages,
          totalTasks,
          limit: pageLimit,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching tasks",
    });
  }
};


// GET TASK BY ID
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        task,
      },
    });
  } catch (error) {
    console.error("Get task error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching the task",
    });
  }
};


// UPDATE TASK
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const validationResult = updateTaskSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const isAdmin = req.user.role === "admin";

    const isTaskOwner =
      task.assignedTo.toString() === req.user.userId.toString();

    if (!isAdmin && !isTaskOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this task",
      });
    }

    const updateData = validationResult.data;

    if (updateData.assignedTo) {
      const assignedUser = await User.findById(updateData.assignedTo);

      if (!assignedUser) {
        return res.status(404).json({
          success: false,
          message: "Assigned user not found",
        });
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    console.error("Update task error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating the task",
    });
  }
};


// DELETE TASK
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const isAdmin = req.user.role === "admin";

    const isTaskOwner =
      task.assignedTo.toString() === req.user.userId.toString();

    if (!isAdmin && !isTaskOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this task",
      });
    }

    await Task.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting the task",
    });
  }
};


module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
};