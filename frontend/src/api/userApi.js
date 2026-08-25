import apiClient from "./apiClient";

export const getUsers = () =>
  apiClient("/users");

export const getUserById = (id) =>
  apiClient(`/users/${id}`);

export const getUserTasks = (id) =>
  apiClient(`/users/${id}/tasks`);

export const createUser = (userData) =>
  apiClient("/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });

export const deleteUser = (id) =>
  apiClient(`/users/${id}`, {
    method: "DELETE",
});

export const resetUserPassword = (id, password) =>
  apiClient(`/users/${id}/reset-password`, {
    method: "PUT",
    body: JSON.stringify({
      password,
    }),
});