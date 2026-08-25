import apiClient from "./apiClient";

// =====================================================
// GET TASK STATISTICS
// =====================================================

export const getTaskStats = () =>
  apiClient("/tasks/stats");

// =====================================================
// GET TASKS
// =====================================================

export const getTasks = (params = {}) => {
  const query = new URLSearchParams(params).toString();

  return apiClient(
    query
      ? `/tasks?${query}`
      : "/tasks"
  );
};

// =====================================================
// GET TASK BY ID
// =====================================================

export const getTaskById = (id) =>
  apiClient(`/tasks/${id}`);

// =====================================================
// CREATE TASK
// =====================================================

export const createTask = (taskData) =>
  apiClient("/tasks", {
    method: "POST",
    body: JSON.stringify(taskData),
  });

// =====================================================
// UPDATE TASK
// =====================================================

export const updateTask = (
  id,
  taskData
) =>
  apiClient(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(taskData),
  });

// =====================================================
// DELETE TASK
// =====================================================

export const deleteTask = (id) =>
  apiClient(`/tasks/${id}`, {
    method: "DELETE",
  });