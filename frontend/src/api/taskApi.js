import apiClient from "./apiClient";

export const getTaskStats = () =>
  apiClient("/tasks/stats");

export const getTasks = (params = {}) => {
  const query = new URLSearchParams(params).toString();

  return apiClient(
    query ? `/tasks?${query}` : "/tasks"
  );
};

export const getTaskById = (id) =>
  apiClient(`/tasks/${id}`);

export const createTask = (taskData) =>
  apiClient("/tasks", {
    method: "POST",
    body: JSON.stringify(taskData),
  });

export const updateTask = (id, taskData) =>
  apiClient(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(taskData),
  });

export const deleteTask = (id) =>
  apiClient(`/tasks/${id}`, {
    method: "DELETE",
  });