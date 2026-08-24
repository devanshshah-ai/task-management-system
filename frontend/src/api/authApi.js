import apiClient from "./apiClient";

export const loginUser = (credentials) =>
  apiClient("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

export const registerUser = (userData) =>
  apiClient("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });

export const getCurrentUser = () =>
  apiClient("/auth/me");