import apiClient from "./apiClient";

export const getTaskStats = () =>
  apiClient("/tasks/stats");

export const getTasks = (params = {}) => {
  const query = new URLSearchParams(params).toString();

  return apiClient(
    query ? `/tasks?${query}` : "/tasks"
  );
};