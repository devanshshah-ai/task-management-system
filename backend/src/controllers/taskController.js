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
const getTasks = async (req, res) => {
  try {
    // Validate query parameters
    const validationResult = taskQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      throw new AppError("Invalid query parameters", 400, {
        errors: validationResult.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
    }

    const {
      page,
      limit,
      search,
      status,
      priority,
      sortBy,
      sortOrder,
    } = validationResult.data;

    const currentPage = page;
    const pageLimit = limit;

    const skip = (currentPage - 1) * pageLimit;

    const query = {};

    // =================================================
    // USER TASK RESTRICTION
    // =================================================
    // Admin can see all tasks.
    // Normal users can only see tasks assigned to them.

    if (req.user.role === "user") {
      query.assignedTo = req.user.userId;
    }

    // =================================================
    // SEARCH
    // =================================================

    if (search) {
      query.title = {
        $regex: search,
        $options: "i",
      };
    }

    // =================================================
    // FILTER BY STATUS
    // =================================================

    if (status) {
      query.status = status;
    }

    // =================================================
    // FILTER BY PRIORITY
    // =================================================

    if (priority) {
      query.priority = priority;
    }

    // =================================================
    // SORT
    // =================================================

    const selectedSortOrder = sortOrder === "desc" ? -1 : 1;

    const sort = {
      [sortBy]: selectedSortOrder,
    };

    // =================================================
    // FETCH TASKS
    // =================================================

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
    throw error;
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

    const [
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
    ] = await Promise.all([
      Task.countDocuments(),

      Task.countDocuments({
        status: "pending",
      }),

      Task.countDocuments({
        status: "in_progress",
      }),

      Task.countDocuments({
        status: "completed",
      }),

      Task.countDocuments({
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