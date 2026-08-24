const { z } = require("zod");

const taskQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1, "Page must be at least 1")
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10),

  search: z
    .string()
    .trim()
    .optional()
    .default(""),

  status: z
    .enum(["pending", "in_progress", "completed"])
    .optional(),

  priority: z
    .enum(["high", "medium", "low"])
    .optional(),

  sortBy: z
    .enum([
      "dueDate",
      "createdAt",
      "updatedAt",
      "title",
      "priority",
      "status",
    ])
    .default("dueDate"),

  sortOrder: z
    .enum(["asc", "desc"])
    .default("asc"),
});

module.exports = {
  taskQuerySchema,
};