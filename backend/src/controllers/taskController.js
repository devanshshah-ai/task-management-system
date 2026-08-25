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

/* =========================================================
   HELPER
========================================================= */

const getCurrentUserId = (req) => {
  return req.user?.userId || req.user?._id || req.user?.id;
};

/* =========================================================
   CREATE TASK
========================================================= */

const createTask = async (req, res) => {
  try {
    const validationResult =
      createTaskSchema.safeParse(req.body);

    if (!validationResult.success) {
      throw new AppError("Validation failed", 400, {
        errors: validationResult.error.issues.map(
          (issue) => ({
            field: issue.path[0],
            message: issue.message,
          })
        ),
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

    /* =========================================
       CHECK ASSIGNED USER
    ========================================= */

    const assignedUser =
      await User.findById(assignedTo);

    if (!assignedUser) {
      throw new AppError(
        "Assigned user not found",
        404
      );
    }

    /* =========================================
       ONLY NORMAL USERS CAN BE ASSIGNED
    ========================================= */

    if (assignedUser.role !== "user") {
      throw new AppError(
        "Tasks can only be assigned to users",
        400
      );
    }

    /* =========================================
       CREATE TASK
    ========================================= */

    const task = await Task.create({
      title,
      description,
      priority,
      status,
      dueDate,
      assignedTo,
      createdBy: getCurrentUserId(req),
    });

    /* =========================================
       POPULATE TASK
    ========================================= */

    const populatedTask =
      await Task.findById(task._id)
        .populate(
          "assignedTo",
          "name email role"
        )
        .populate(
          "createdBy",
          "name email role"
        );

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

/* =========================================================
   GET ALL TASKS
========================================================= */

const getTasks = async (req, res, next) => {
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

    const currentPage = Math.max(
      Number(page),
      1
    );

    const pageLimit = Math.max(
      Number(limit),
      1
    );

    const skip =
      (currentPage - 1) * pageLimit;

    /* =========================================
       CURRENT USER
    ========================================= */

    const currentUserId =
      getCurrentUserId(req);

    /* =========================================
       BUILD MATCH QUERY
    ========================================= */

    let matchQuery = {};

    /* =========================================
       USER TASK RESTRICTION
       
       ADMIN:
       → Can see all tasks

       NORMAL USER:
       → Can only see tasks assigned to them
    ========================================= */

    if (req.user.role !== "admin") {
      if (
        !currentUserId ||
        !mongoose.Types.ObjectId.isValid(
          currentUserId
        )
      ) {
        throw new AppError(
          "Invalid user ID",
          401
        );
      }

      /*
        IMPORTANT:

        aggregate() does not automatically
        convert a string into ObjectId.

        Therefore we explicitly convert it.
      */

      matchQuery.assignedTo =
        new mongoose.Types.ObjectId(
          currentUserId
        );
    }

    /* =========================================
       SEARCH BY TITLE
    ========================================= */

    if (search.trim()) {
      matchQuery.title = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    /* =========================================
       FILTER BY STATUS
    ========================================= */

    if (status) {
      matchQuery.status = status;
    }

    /* =========================================
       FILTER BY PRIORITY
    ========================================= */

    if (priority) {
      matchQuery.priority = priority;
    }

    /* =========================================
       TOTAL TASKS
    ========================================= */

    const totalTasks =
      await Task.countDocuments(
        matchQuery
      );

    /* =========================================
       SORT CONFIGURATION
    ========================================= */

    const allowedSortFields = [
      "dueDate",
      "createdAt",
      "title",
      "priority",
      "status",
    ];

    const safeSortBy =
      allowedSortFields.includes(sortBy)
        ? sortBy
        : "dueDate";

    const safeSortOrder =
      sortOrder === "desc" ? -1 : 1;

    /* =========================================
       TASK AGGREGATION
    ========================================= */

    const tasks = await Task.aggregate([
      /* =======================================
         MATCH
      ======================================= */

      {
        $match: matchQuery,
      },

      /* =======================================
         STATUS ORDER

         Active tasks first
         Pending / In Progress
         
         Completed tasks last
      ======================================= */

      {
        $addFields: {
          statusOrder: {
            $cond: [
              {
                $eq: [
                  "$status",
                  "completed",
                ],
              },
              1,
              0,
            ],
          },
        },
      },

      /* =======================================
         SORT
      ======================================= */

      {
        $sort: {
          statusOrder: 1,

          [safeSortBy]:
            safeSortOrder,

          createdAt: -1,
        },
      },

      /* =======================================
         PAGINATION
      ======================================= */

      {
        $skip: skip,
      },

      {
        $limit: pageLimit,
      },

      /* =======================================
         POPULATE ASSIGNED USER
      ======================================= */

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

      /* =======================================
         POPULATE CREATED BY
      ======================================= */

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

      /* =======================================
         REMOVE SENSITIVE / INTERNAL DATA
      ======================================= */

      {
        $project: {
          statusOrder: 0,

          "assignedTo.password": 0,

          "createdBy.password": 0,
        },
      },
    ]);

    /* =========================================
       PAGINATION
    ========================================= */

    const totalPages =
      Math.ceil(
        totalTasks / pageLimit
      );

    /* =========================================
       RESPONSE
    ========================================= */

    return res.status(200).json({
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

/* =========================================================
   GET TASK BY ID
========================================================= */

const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    /* =========================================
       VALIDATE TASK ID
    ========================================= */

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      throw new AppError(
        "Invalid task ID",
        400
      );
    }

    /* =========================================
       FIND TASK
    ========================================= */

    const task =
      await Task.findById(id)
        .populate(
          "assignedTo",
          "name email role"
        )
        .populate(
          "createdBy",
          "name email role"
        );

    if (!task) {
      throw new AppError(
        "Task not found",
        404
      );
    }

    /* =========================================
       USER TASK RESTRICTION
    ========================================= */

    if (req.user.role === "user") {
      const currentUserId =
        getCurrentUserId(req);

      const assignedUserId =
        task.assignedTo?._id;

      if (
        !assignedUserId ||
        String(assignedUserId) !==
          String(currentUserId)
      ) {
        throw new AppError(
          "Task not found",
          404
        );
      }
    }

    /* =========================================
       RESPONSE
    ========================================= */

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

/* =========================================================
   UPDATE TASK
========================================================= */

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;

    /* =========================================
       VALIDATE TASK ID
    ========================================= */

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      throw new AppError(
        "Invalid task ID",
        400
      );
    }

    /* =========================================
       VALIDATE REQUEST BODY
    ========================================= */

    const validationResult =
      updateTaskSchema.safeParse(
        req.body
      );

    if (!validationResult.success) {
      throw new AppError(
        "Validation failed",
        400,
        {
          errors:
            validationResult.error.issues.map(
              (issue) => ({
                field: issue.path[0],
                message: issue.message,
              })
            ),
        }
      );
    }

    /* =========================================
       FIND TASK
    ========================================= */

    const task =
      await Task.findById(id);

    if (!task) {
      throw new AppError(
        "Task not found",
        404
      );
    }

    /* =========================================
       AUTHORIZATION
    ========================================= */

    const isAdmin =
      req.user.role === "admin";

    const currentUserId =
      getCurrentUserId(req);

    const isTaskOwner =
      task.assignedTo &&
      String(task.assignedTo) ===
        String(currentUserId);

    /* =========================================
       ADMIN OR TASK OWNER
    ========================================= */

    if (!isAdmin && !isTaskOwner) {
      throw new AppError(
        "You are not authorized to update this task",
        403
      );
    }

    const updateData =
      validationResult.data;

    /* =========================================
       REASSIGN TASK
    ========================================= */

    if (updateData.assignedTo) {
      /* =======================================
         CHECK ASSIGNED USER
      ======================================= */

      const assignedUser =
        await User.findById(
          updateData.assignedTo
        );

      if (!assignedUser) {
        throw new AppError(
          "Assigned user not found",
          404
        );
      }

      /* =======================================
         ONLY NORMAL USERS
      ======================================= */

      if (
        assignedUser.role !== "user"
      ) {
        throw new AppError(
          "Tasks can only be assigned to users",
          400
        );
      }

      /* =======================================
         ONLY ADMIN CAN REASSIGN
      ======================================= */

      if (!isAdmin) {
        throw new AppError(
          "Only admins can reassign tasks",
          403
        );
      }
    }

    /* =========================================
       UPDATE
    ========================================= */

    const updatedTask =
      await Task.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      )
        .populate(
          "assignedTo",
          "name email role"
        )
        .populate(
          "createdBy",
          "name email role"
        );

    /* =========================================
       RESPONSE
    ========================================= */

    return res.status(200).json({
      success: true,

      message:
        "Task updated successfully",

      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    throw error;
  }
};

/* =========================================================
   DELETE TASK
========================================================= */

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    /* =========================================
       VALIDATE TASK ID
    ========================================= */

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      throw new AppError(
        "Invalid task ID",
        400
      );
    }

    /* =========================================
       FIND TASK
    ========================================= */

    const task =
      await Task.findById(id);

    if (!task) {
      throw new AppError(
        "Task not found",
        404
      );
    }

    /* =========================================
       AUTHORIZATION
    ========================================= */

    const isAdmin =
      req.user.role === "admin";

    const currentUserId =
      getCurrentUserId(req);

    const isTaskOwner =
      task.assignedTo &&
      String(task.assignedTo) ===
        String(currentUserId);

    /* =========================================
       ADMIN OR TASK OWNER
    ========================================= */

    if (!isAdmin && !isTaskOwner) {
      throw new AppError(
        "You are not authorized to delete this task",
        403
      );
    }

    /* =========================================
       DELETE
    ========================================= */

    await Task.findByIdAndDelete(id);

    /* =========================================
       RESPONSE
    ========================================= */

    return res.status(200).json({
      success: true,

      message:
        "Task deleted successfully",
    });
  } catch (error) {
    throw error;
  }
};

/* =========================================================
   GET TASK STATISTICS
========================================================= */

const getTaskStats = async (req, res) => {
  try {
    const now = new Date();

    /* =========================================
       CURRENT USER
    ========================================= */

    const currentUserId =
      getCurrentUserId(req);

    /* =========================================
       BASE QUERY

       ADMIN:
       → All tasks

       USER:
       → Only assigned tasks
    ========================================= */

    let baseQuery = {};

    if (req.user.role !== "admin") {
      if (
        !currentUserId ||
        !mongoose.Types.ObjectId.isValid(
          currentUserId
        )
      ) {
        throw new AppError(
          "Invalid user ID",
          401
        );
      }

      baseQuery = {
        assignedTo:
          new mongoose.Types.ObjectId(
            currentUserId
          ),
      };
    }

    /* =========================================
       STATISTICS
    ========================================= */

    const [
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
    ] = await Promise.all([
      /* TOTAL */

      Task.countDocuments(
        baseQuery
      ),

      /* PENDING */

      Task.countDocuments({
        ...baseQuery,

        status: "pending",
      }),

      /* IN PROGRESS */

      Task.countDocuments({
        ...baseQuery,

        status: "in_progress",
      }),

      /* COMPLETED */

      Task.countDocuments({
        ...baseQuery,

        status: "completed",
      }),

      /* OVERDUE */

      Task.countDocuments({
        ...baseQuery,

        dueDate: {
          $lt: now,
        },

        status: {
          $ne: "completed",
        },
      }),
    ]);

    /* =========================================
       RESPONSE
    ========================================= */

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

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
};