import { useEffect, useMemo, useState } from "react";

import {
  getUsers,
  createUser,
  deleteUser,
  resetUserPassword,
} from "../api/userApi";

import { useAuth } from "../context/AuthContext";

import "./Users.css";

const Users = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // ==========================================
  // CREATE USER STATE
  // ==========================================

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  // ==========================================
  // RESET PASSWORD STATE
  // ==========================================

  const [showResetModal, setShowResetModal] = useState(false);
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // ==========================================
  // DELETE STATE
  // ==========================================

  const [deletingId, setDeletingId] = useState(null);

  // ==========================================
  // LOAD USERS
  // ==========================================

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getUsers();

      const allUsers = response?.data?.users || [];

      setUsers(allUsers);
    } catch (error) {
      console.error("Unable to load users:", error);

      setError(
        error?.response?.data?.message ||
          error?.data?.message ||
          error?.message ||
          "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // ==========================================
  // FILTER USERS
  // ==========================================

  const filteredUsers = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !searchValue ||
        user.name?.toLowerCase().includes(searchValue);

      const matchesRole =
        roleFilter === "all" ||
        user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  // ==========================================
  // COUNTS
  // ==========================================

  const userCount = users.filter(
    (user) => user.role === "user"
  ).length;

  const adminCount = users.filter(
    (user) => user.role === "admin"
  ).length;

  // ==========================================
  // CREATE USER
  // ==========================================

  const handleCreateChange = (event) => {
    const { name, value } = event.target;

    setCreateForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Clear modal error as soon as user starts fixing it
    if (createError) {
      setCreateError("");
    }
  };

  const closeCreateModal = () => {
    if (creating) {
      return;
    }

    setShowCreateModal(false);

    setCreateForm({
      name: "",
      email: "",
      password: "",
      role: "user",
    });

    setCreateError("");
  };

  const openCreateModal = () => {
    setCreateError("");

    setCreateForm({
      name: "",
      email: "",
      password: "",
      role: "user",
    });

    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();

    setCreateError("");
    setError("");

    const name = createForm.name.trim();
    const email = createForm.email.trim();
    const password = createForm.password;
    const role = createForm.role;

    // ==========================================
    // FRONTEND VALIDATION
    // ==========================================

    if (!name) {
      setCreateError("Please enter the user's full name.");
      return;
    }

    if (!email) {
      setCreateError("Please enter the user's email.");
      return;
    }

    if (!password) {
      setCreateError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setCreateError(
        "Password must be at least 6 characters long."
      );
      return;
    }

    try {
      setCreating(true);

      console.log("Create user form submitted");

      console.log("Create user data:", {
        name,
        email,
        role,
      });

      const response = await createUser({
        name,
        email,
        password,
        role,
      });

      console.log(
        "User created successfully:",
        response
      );

      // Reload users first
      await loadUsers();

      // Close only after successful creation
      closeCreateModal();

      alert(
        `${name} has been created successfully.`
      );
    } catch (error) {
      console.error("Create user error:", error);

      // ==========================================
      // BACKEND ERROR HANDLING
      // ==========================================

      const backendErrors =
        error?.response?.data?.data?.errors ||
        error?.response?.data?.errors ||
        error?.data?.errors;

      if (Array.isArray(backendErrors)) {
        const errorMessage = backendErrors
          .map((item) => item?.message)
          .filter(Boolean)
          .join(" ");

        setCreateError(
          errorMessage ||
            "Unable to create user."
        );
      } else {
        const backendMessage =
          error?.response?.data?.message ||
          error?.response?.data?.data?.message ||
          error?.data?.message ||
          error?.message;

        setCreateError(
          backendMessage ||
            "Unable to create user. Please try again."
        );
      }
    } finally {
      setCreating(false);
    }
  };

  // ==========================================
  // RESET PASSWORD
  // ==========================================

  const openResetPasswordModal = (selectedUser) => {
    setResettingUser(selectedUser);
    setNewPassword("");
    setError("");
    setShowResetModal(true);
  };

  const closeResetPasswordModal = () => {
    if (resetting) {
      return;
    }

    setShowResetModal(false);
    setResettingUser(null);
    setNewPassword("");
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    setError("");

    if (!newPassword.trim()) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setError(
        "Password must be at least 6 characters long."
      );
      return;
    }

    try {
      setResetting(true);

      await resetUserPassword(
        resettingUser._id,
        {
          password: newPassword,
        }
      );

      closeResetPasswordModal();

      alert(
        `Password updated successfully for ${resettingUser.name}.`
      );
    } catch (error) {
      console.error(
        "Reset password error:",
        error
      );

      const backendErrors =
        error?.data?.errors ||
        error?.response?.data?.data?.errors;

      if (Array.isArray(backendErrors)) {
        setError(
          backendErrors
            .map((item) => item.message)
            .join(" ")
        );
      } else {
        setError(
          error?.response?.data?.message ||
            error?.data?.message ||
            error?.message ||
            "Unable to reset password."
        );
      }
    } finally {
      setResetting(false);
    }
  };

  // ==========================================
  // DELETE USER
  // ==========================================

  const handleDeleteUser = async (selectedUser) => {
    if (
      currentUser?.id &&
      selectedUser._id === currentUser.id
    ) {
      alert(
        "You cannot delete your own account."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedUser.name}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(selectedUser._id);
      setError("");

      await deleteUser(selectedUser._id);

      setUsers((previous) =>
        previous.filter(
          (item) =>
            item._id !== selectedUser._id
        )
      );

      alert(
        `${selectedUser.name} has been deleted successfully.`
      );
    } catch (error) {
      console.error(
        "Delete user error:",
        error
      );

      setError(
        error?.response?.data?.message ||
          error?.data?.message ||
          error?.message ||
          "Unable to delete user."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  return (
    <main className="users-page">

      {/* ==========================================
          PAGE HEADER
      ========================================== */}

      <section className="users-page-header">

        <div className="users-page-heading">

          <span className="users-eyebrow">
            User Management
          </span>

          <h1>Users</h1>

          <p>
            Manage users and administrators
            across your task management system.
          </p>

        </div>

        <button
          type="button"
          className="users-create-button"
          onClick={openCreateModal}
        >
          <span className="users-create-icon">
            +
          </span>

          Create User
        </button>

      </section>


      {/* ==========================================
          SUMMARY
      ========================================== */}

      <section className="users-summary">

        <div className="users-summary-card">

          <div className="users-summary-icon">
            👥
          </div>

          <div>
            <span className="users-summary-label">
              Total Users
            </span>

            <strong>
              {users.length}
            </strong>
          </div>

        </div>


        <div className="users-summary-card">

          <div className="users-summary-icon user">
            U
          </div>

          <div>
            <span className="users-summary-label">
              Normal Users
            </span>

            <strong>
              {userCount}
            </strong>
          </div>

        </div>


        <div className="users-summary-card">

          <div className="users-summary-icon admin">
            A
          </div>

          <div>
            <span className="users-summary-label">
              Administrators
            </span>

            <strong>
              {adminCount}
            </strong>
          </div>

        </div>

      </section>


      {/* ==========================================
          PAGE ERROR
      ========================================== */}

      {error && (
        <div className="users-error">
          {error}
        </div>
      )}


      {/* ==========================================
          USERS SECTION
      ========================================== */}

      <section className="users-section">

        <div className="users-section-header">

          <div>

            <h2>
              All Users
            </h2>

            <p>
              {filteredUsers.length}{" "}
              {filteredUsers.length === 1
                ? "user"
                : "users"}{" "}
              displayed
            </p>

          </div>

        </div>


        {/* ==========================================
            FILTERS
        ========================================== */}

        <div className="users-filters">

          <div className="users-search">

            <span className="users-search-icon">
              ⌕
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search users by name..."
            />

            {search && (
              <button
                type="button"
                className="users-search-clear"
                onClick={() =>
                  setSearch("")
                }
                aria-label="Clear search"
              >
                ×
              </button>
            )}

          </div>


          <div className="users-role-filter">

            <label htmlFor="role-filter">
              Role
            </label>

            <select
              id="role-filter"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target.value
                )
              }
            >

              <option value="all">
                All Roles
              </option>

              <option value="user">
                Users
              </option>

              <option value="admin">
                Administrators
              </option>

            </select>

          </div>

        </div>


        {/* ==========================================
            LOADING
        ========================================== */}

        {loading && (
          <div className="users-loading">

            <div className="users-loading-spinner" />

            <p>
              Loading users...
            </p>

          </div>
        )}


        {/* ==========================================
            EMPTY
        ========================================== */}

        {!loading &&
          filteredUsers.length === 0 && (
            <div className="users-empty">

              <div className="users-empty-icon">
                👥
              </div>

              <h3>
                No users found
              </h3>

              <p>
                Try changing your search or
                role filter.
              </p>

              {(search ||
                roleFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("all");
                  }}
                >
                  Clear Filters
                </button>
              )}

            </div>
          )}


        {/* ==========================================
            USER TABLE
        ========================================== */}

        {!loading &&
          filteredUsers.length > 0 && (
            <div className="users-table-wrapper">

              <table className="users-table">

                <thead>
                  <tr>

                    <th>
                      User
                    </th>

                    <th>
                      Email
                    </th>

                    <th>
                      Role
                    </th>

                    <th>
                      Joined
                    </th>

                    <th>
                      Actions
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {filteredUsers.map((user) => {

                    const isCurrentUser =
                      currentUser?.id ===
                      user._id;

                    const isDeleting =
                      deletingId === user._id;

                    return (
                      <tr key={user._id}>

                        {/* User */}

                        <td>

                          <div className="users-user-cell">

                            <div
                              className={`users-avatar ${
                                user.role === "admin"
                                  ? "admin"
                                  : ""
                              }`}
                            >
                              {user.name
                                ?.charAt(0)
                                ?.toUpperCase() ||
                                "U"}
                            </div>

                            <div className="users-user-info">

                              <strong>
                                {user.name}
                              </strong>

                              <span>
                                ID:{" "}
                                {user._id
                                  ?.slice(-6)
                                  .toUpperCase()}
                              </span>

                            </div>

                          </div>

                        </td>


                        {/* Email */}

                        <td>

                          <span className="users-email">
                            {user.email}
                          </span>

                        </td>


                        {/* Role */}

                        <td>

                          <span
                            className={`users-role-badge ${
                              user.role === "admin"
                                ? "admin"
                                : "user"
                            }`}
                          >

                            <span className="users-role-dot" />

                            {user.role === "admin"
                              ? "Administrator"
                              : "User"}

                          </span>

                        </td>


                        {/* Joined */}

                        <td>

                          <span className="users-date">
                            {formatDate(
                              user.createdAt
                            )}
                          </span>

                        </td>


                        {/* Actions */}

                        <td>

                          <div className="users-actions">

                            <button
                              type="button"
                              className="users-action-reset"
                              onClick={() =>
                                openResetPasswordModal(
                                  user
                                )
                              }
                              disabled={isDeleting}
                            >
                              Reset Password
                            </button>

                            <button
                              type="button"
                              className="users-action-delete"
                              onClick={() =>
                                handleDeleteUser(
                                  user
                                )
                              }
                              disabled={isDeleting}
                            >
                              {isDeleting
                                ? "Deleting..."
                                : "Delete"}
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

      </section>


      {/* ==========================================
          CREATE USER MODAL
      ========================================== */}

      {showCreateModal && (
        <div
          className="users-modal-overlay"
          onClick={closeCreateModal}
        >

          <div
            className="users-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="users-modal-header">

              <div>

                <span className="users-eyebrow">
                  User Management
                </span>

                <h2>
                  Create User
                </h2>

                <p>
                  Add a new user or administrator
                  to the system.
                </p>

              </div>

              <button
                type="button"
                className="users-modal-close"
                onClick={closeCreateModal}
                disabled={creating}
              >
                ×
              </button>

            </div>


            {/* ==========================================
                CREATE ERROR INSIDE MODAL
            ========================================== */}

            {createError && (
              <div className="users-modal-error">

                <span className="users-modal-error-icon">
                  !
                </span>

                <div>
                  <strong>
                    Unable to create user
                  </strong>

                  <p>
                    {createError}
                  </p>
                </div>

              </div>
            )}


            <form
              className="users-create-form"
              onSubmit={handleCreateSubmit}
            >

              <div className="users-form-group">

                <label htmlFor="user-name">
                  Full Name
                </label>

                <input
                  id="user-name"
                  name="name"
                  type="text"
                  value={createForm.name}
                  onChange={handleCreateChange}
                  placeholder="Enter full name"
                  disabled={creating}
                  required
                />

              </div>


              <div className="users-form-group">

                <label htmlFor="user-email">
                  Email
                </label>

                <input
                  id="user-email"
                  name="email"
                  type="email"
                  value={createForm.email}
                  onChange={handleCreateChange}
                  placeholder="Enter email address"
                  disabled={creating}
                  required
                />

              </div>


              <div className="users-form-grid">

                <div className="users-form-group">

                  <label htmlFor="user-password">
                    Password
                  </label>

                  <input
                    id="user-password"
                    name="password"
                    type="password"
                    value={createForm.password}
                    onChange={handleCreateChange}
                    placeholder="Enter password"
                    minLength={6}
                    disabled={creating}
                    required
                  />

                  <span className="users-form-hint">
                    Password must be at least 6
                    characters.
                  </span>

                </div>


                <div className="users-form-group">

                  <label htmlFor="user-role">
                    Role
                  </label>

                  <select
                    id="user-role"
                    name="role"
                    value={createForm.role}
                    onChange={handleCreateChange}
                    disabled={creating}
                  >

                    <option value="user">
                      User
                    </option>

                    <option value="admin">
                      Administrator
                    </option>

                  </select>

                </div>

              </div>


              <div className="users-modal-footer">

                <button
                  type="button"
                  className="users-cancel-button"
                  onClick={closeCreateModal}
                  disabled={creating}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="users-submit-button"
                  disabled={creating}
                >
                  {creating
                    ? "Creating..."
                    : `Create ${
                        createForm.role === "admin"
                          ? "Administrator"
                          : "User"
                      }`}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* ==========================================
          RESET PASSWORD MODAL
      ========================================== */}

      {showResetModal &&
        resettingUser && (
          <div
            className="users-modal-overlay"
            onClick={closeResetPasswordModal}
          >

            <div
              className="users-modal users-reset-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="users-modal-header">

                <div>

                  <span className="users-eyebrow">
                    User Management
                  </span>

                  <h2>
                    Reset Password
                  </h2>

                  <p>
                    Set a new password for{" "}
                    <strong>
                      {resettingUser.name}
                    </strong>
                    .
                  </p>

                </div>

                <button
                  type="button"
                  className="users-modal-close"
                  onClick={
                    closeResetPasswordModal
                  }
                  disabled={resetting}
                >
                  ×
                </button>

              </div>


              <form
                className="users-create-form"
                onSubmit={handleResetPassword}
              >

                <div className="users-form-group">

                  <label htmlFor="reset-password">
                    New Password
                  </label>

                  <input
                    id="reset-password"
                    name="password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(
                        event.target.value
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="Enter new password"
                    minLength={6}
                    required
                    autoFocus
                    disabled={resetting}
                  />

                  <span className="users-form-hint">
                    Password must be at least 6
                    characters.
                  </span>

                </div>


                <div className="users-modal-footer">

                  <button
                    type="button"
                    className="users-cancel-button"
                    onClick={
                      closeResetPasswordModal
                    }
                    disabled={resetting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="users-submit-button"
                    disabled={resetting}
                  >
                    {resetting
                      ? "Updating..."
                      : "Update Password"}
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

    </main>
  );
};

export default Users;