import apiClient from "./apiClient";

export const getUsers = () =>
  apiClient("/users");