const mongoose = require("mongoose");

const Task = require("../models/Task");
const User = require("../models/User");
const AppError = require("../utils/AppError");

const {
  createTaskSchema,
  updateTaskSchema,
} = require("../validators/taskValidator");

const {
  taskQuerySchema,
} = require("../validators/taskQueryValidator");

// CREATE TASK
const createTask = async (req, res) => {
  try {
    const validationResult = createTaskSchema.safeParse(req.body);

    if (!validationResult.success) {
      throw new AppError("Validation failed", 400, {
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
      throw new AppError("Assigned user not found", 404);
    }

    // Tasks can only be assigned to normal users
    if (assignedUser.role !== "user") {
      throw new AppError(
        "Tasks can only be assigned to users",
        400
      );
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
    throw error;
  }
};

// GET ALL TASKS
const getTasks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      priority,
    } = req.query;

    const currentPage = Math.max(Number(page), 1);
    const pageLimit = Math.max(Number(limit), 1);
    const skip = (currentPage - 1) * pageLimit;

    /* =========================================
       Build Match Query
    ========================================= */

    const matchQuery = {};

    // Search by title
    if (search.trim()) {
      matchQuery.title = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    // Filter by status
    if (status) {
      matchQuery.status = status;
    }

    // Filter by priority
    if (priority) {
      matchQuery.priority = priority;
    }

    /* =========================================
       Get Total Tasks
    ========================================= */

    const totalTasks = await Task.countDocuments(matchQuery);

    /* =========================================
       Task Ordering

       Active tasks first
       ↓
       Pending / In Progress
       ↓
       Sorted by due date

       Completed tasks last
       ↓
       Sorted by due date
    ========================================= */

    const tasks = await Task.aggregate([
      {
        $match: matchQuery,
      },

      {
        $addFields: {
          statusOrder: {
            $cond: [
              { $eq: ["$status", "completed"] },
              1,
              0,
            ],
          },
        },
      },

      {
        $sort: {
          statusOrder: 1,
          dueDate: 1,
          createdAt: -1,
        },
      },

      {
        $skip: skip,
      },

      {
        $limit: pageLimit,
      },

      /* =========================================
         Populate assignedTo
      ========================================= */

      {
        $lookup: {
          from: "users",
          localField: "assignedTo",
          foreignField: "_id",
          as: "assignedTo",
        },
      },

      {
        $unwind: {
          path: "$assignedTo",
          preserveNullAndEmptyArrays: true,
        },
      },

      /* =========================================
         Populate createdBy
      ========================================= */

      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },

      {
        $unwind: {
          path: "$createdBy",
          preserveNullAndEmptyArrays: true,
        },
      },

      /* =========================================
         Remove Internal statusOrder
      ========================================= */

      {
        $project: {
          statusOrder: 0,

          "assignedTo.password": 0,
          "createdBy.password": 0,
        },
      },
    ]);

    /* =========================================
       Pagination
    ========================================= */

    const totalPages = Math.ceil(
      totalTasks / pageLimit
    );

    res.status(200).json({
      success: true,
      data: {
        tasks,

        pagination: {
          currentPage,
          totalPages,
          totalTasks,
          limit: pageLimit,

          hasNextPage:
            currentPage < totalPages,

          hasPreviousPage:
            currentPage > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET TASK BY ID
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid task ID", 400);
    }

    const task = await Task.findById(id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    // =================================================
    // USER TASK RESTRICTION
    // =================================================
    // Users cannot view another user's task.

    if (
      req.user.role === "user" &&
      task.assignedTo._id.toString() !== req.user.userId.toString()
    ) {
      // Return 404 instead of 403 so we don't reveal
      // that another user's task exists.
      throw new AppError("Task not found", 404);
    }

    return res.status(200).json({
      success: true,
      data: {
        task,
      },
    });
  } catch (error) {
    throw error;
  }
};

// UPDATE TASK
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid task ID", 400);
    }

    // Validate request body
    const validationResult = updateTaskSchema.safeParse(req.body);

    if (!validationResult.success) {
      throw new AppError("Validation failed", 400, {
        errors: validationResult.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    // =================================================
    // AUTHORIZATION
    // =================================================

    const isAdmin = req.user.role === "admin";

    const isTaskOwner =
      task.assignedTo.toString() === req.user.userId.toString();

    // Admin can update any task.
    // User can only update their assigned task.
    if (!isAdmin && !isTaskOwner) {
      throw new AppError(
        "You are not authorized to update this task",
        403
      );
    }

    const updateData = validationResult.data;

    // =================================================
    // REASSIGN TASK
    // =================================================

    if (updateData.assignedTo) {
      // Verify assigned user exists
      const assignedUser = await User.findById(
        updateData.assignedTo
      );

      if (!assignedUser) {
        throw new AppError("Assigned user not found", 404);
      }

      // Cannot assign tasks to admins
      if (assignedUser.role !== "user") {
        throw new AppError(
          "Tasks can only be assigned to users",
          400
        );
      }

      // Only admins can reassign tasks
      if (!isAdmin) {
        throw new AppError(
          "Only admins can reassign tasks",
          403
        );
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
    throw error;
  }
};

// DELETE TASK
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid task ID", 400);
    }

    const task = await Task.findById(id);

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    // =================================================
    // AUTHORIZATION
    // =================================================

    const isAdmin = req.user.role === "admin";

    const isTaskOwner =
      task.assignedTo.toString() === req.user.userId.toString();

    // Admin can delete any task.
    // User can delete only their assigned task.
    if (!isAdmin && !isTaskOwner) {
      throw new AppError(
        "You are not authorized to delete this task",
        403
      );
    }

    await Task.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    throw error;
  }
};

// GET TASK STATISTICS
const getTaskStats = async (req, res) => {
  try {
    const now = new Date();

    const baseQuery =
      req.user.role === "admin"
        ? {}
        : {
            assignedTo: req.user.userId,
          };

    const [
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
    ] = await Promise.all([
      Task.countDocuments(baseQuery),

      Task.countDocuments({
        ...baseQuery,
        status: "pending",
      }),

      Task.countDocuments({
        ...baseQuery,
        status: "in_progress",
      }),

      Task.countDocuments({
        ...baseQuery,
        status: "completed",
      }),

      Task.countDocuments({
        ...baseQuery,
        dueDate: { $lt: now },
        status: { $ne: "completed" },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
      },
    });
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
};