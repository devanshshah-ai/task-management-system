const { z } = require("zod");

const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Task title must be at least 2 characters long")
    .max(100, "Task title cannot exceed 100 characters"),

  description: z
    .string()
    .trim()
    .max(1000, "Task description cannot exceed 1000 characters")
    .optional()
    .default(""),

  priority: z
    .enum(["high", "medium", "low"])
    .default("medium"),

  status: z
    .enum(["pending", "in_progress", "completed"])
    .default("pending"),

  dueDate: z
    .string()
    .datetime({ offset: true }),

  assignedTo: z
    .string()
    .min(1, "Assigned user is required"),
});

const updateTaskSchema = z.object({
  title: z
    .string()
    .min(2, "Task title must be at least 2 characters long")
    .max(100, "Task title cannot exceed 100 characters")
    .optional(),

  description: z
    .string()
    .max(1000, "Task description cannot exceed 1000 characters")
    .optional(),

  priority: z
    .enum(["high", "medium", "low"])
    .optional(),

  status: z
    .enum(["pending", "in_progress", "completed"])
    .optional(),

  dueDate: z
    .string()
    .optional(),

  assignedTo: z
    .string()
    .optional(),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
};