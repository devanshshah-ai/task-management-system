import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getUsers } from "../api/userApi";
import { createTask } from "../api/taskApi";

import "./CreateTask.css";

const initialForm = {
  title: "",
  description: "",
  priority: "medium",
  status: "pending",
  dueDate: "",
  assignedTo: "",
};

const CreateTask = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [users, setUsers] = useState([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================================
  // LOAD USERS
  // Only admins need the user list because only admins can
  // choose who the task is assigned to.
  // ============================================================

  useEffect(() => {
    const loadUsers = async () => {
      // Normal users don't need to load the users list.
      if (user?.role !== "admin") {
        setLoadingUsers(false);
        return;
      }

      try {
        setLoadingUsers(true);
        setError("");

        const response = await getUsers();

        const allUsers = response?.data?.users || [];

        // Only normal users can receive tasks.
        const normalUsers = allUsers.filter(
          (item) => item.role === "user"
        );

        setUsers(normalUsers);
      } catch (error) {
        console.error("Unable to load users:", error);

        setError(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to load users."
        );
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [user]);

  // ============================================================
  // HANDLE FORM CHANGE
  // ============================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  };

  // ============================================================
  // HANDLE SUBMIT
  // ============================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // ------------------------------------------
    // Title validation
    // ------------------------------------------

    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (form.title.trim().length < 2) {
      setError(
        "Task title must be at least 2 characters long."
      );
      return;
    }

    // ------------------------------------------
    // Due date validation
    // ------------------------------------------

    if (!form.dueDate) {
      setError("Due date is required.");
      return;
    }

    // ------------------------------------------
    // Assignment validation
    //
    // Admin:
    //     Must select a user.
    //
    // Normal user:
    //     Automatically assigned to themselves.
    // ------------------------------------------

    if (user?.role === "admin" && !form.assignedTo) {
      setError("Please assign the task to a user.");
      return;
    }

    if (!user?._id && !user?.id) {
      setError("Unable to identify the logged-in user.");
      return;
    }

    try {
      setCreating(true);

      // ------------------------------------------
      // Determine assigned user
      // ------------------------------------------

      const loggedInUserId = user?._id || user?.id;

      const assignedUserId =
        user?.role === "admin"
          ? form.assignedTo
          : loggedInUserId;

      // ------------------------------------------
      // Create task
      // ------------------------------------------

      await createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        status: form.status,
        dueDate: new Date(form.dueDate).toISOString(),
        assignedTo: assignedUserId,
      });

      setSuccess("Task created successfully.");

      setTimeout(() => {
        navigate("/tasks");
      }, 700);
    } catch (error) {
      console.error("Create task error:", error);

      const backendErrors =
        error?.response?.data?.data?.errors ||
        error?.response?.data?.errors ||
        error?.data?.errors;

      if (Array.isArray(backendErrors)) {
        setError(
          backendErrors
            .map((item) => item.message)
            .join(" ")
        );
      } else {
        setError(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to create task."
        );
      }
    } finally {
      setCreating(false);
    }
  };

  // ============================================================
  // CANCEL
  // ============================================================

  const handleCancel = () => {
    if (creating) {
      return;
    }

    navigate("/tasks");
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <main className="create-task-page">

      {/* =========================
          Page Header
      ========================= */}

      <section className="create-task-header">

        <div className="create-task-heading">

          <span className="create-task-eyebrow">
            Task Management
          </span>

          <h1>Create Task</h1>

          <p>
            Create a new task and assign it to a
            team member.
          </p>

        </div>

        <button
          type="button"
          className="create-task-back-button"
          onClick={handleCancel}
          disabled={creating}
        >
          ← Back to Tasks
        </button>

      </section>

      {/* =========================
          Form Card
      ========================= */}

      <section className="create-task-card">

        <div className="create-task-card-header">

          <div>
            <h2>Task Details</h2>

            <p>
              Enter the information required to
              create this task.
            </p>
          </div>

        </div>

        {/* =========================
            Messages
        ========================= */}

        {error && (
          <div className="create-task-error">
            {error}
          </div>
        )}

        {success && (
          <div className="create-task-success">
            {success}
          </div>
        )}

        {/* =========================
            Form
        ========================= */}

        <form
          className="create-task-form"
          onSubmit={handleSubmit}
        >

          {/* =========================
              Title
          ========================= */}

          <div className="create-task-field full-width">

            <label htmlFor="title">
              Task Title
            </label>

            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter task title"
              maxLength={100}
              required
            />

          </div>

          {/* =========================
              Description
          ========================= */}

          <div className="create-task-field full-width">

            <label htmlFor="description">
              Description
            </label>

            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the task..."
              maxLength={1000}
              rows={4}
            />

            <span className="create-task-hint">
              {form.description.length}/1000
            </span>

          </div>

          {/* =========================
              Two Column Fields
          ========================= */}

          <div className="create-task-form-grid">

            {/* Priority */}

            <div className="create-task-field">

              <label htmlFor="priority">
                Priority
              </label>

              <select
                id="priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
              >
                <option value="high">
                  High
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="low">
                  Low
                </option>
              </select>

            </div>

            {/* Status */}

            <div className="create-task-field">

              <label htmlFor="status">
                Status
              </label>

              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="pending">
                  Pending
                </option>

                <option value="in_progress">
                  In Progress
                </option>

                <option value="completed">
                  Completed
                </option>
              </select>

            </div>

            {/* Due Date */}

            <div className="create-task-field">

              <label htmlFor="dueDate">
                Due Date
              </label>

              <input
                id="dueDate"
                name="dueDate"
                type="datetime-local"
                value={form.dueDate}
                onChange={handleChange}
                required
              />

            </div>

            {/* =================================================
                ASSIGN TO

                ONLY ADMIN CAN SEE THIS FIELD.

                Normal user:
                - Field is hidden.
                - Backend/frontend automatically assigns
                  task to logged-in user.
               ================================================= */}

            {user?.role === "admin" && (
              <div className="create-task-field">

                <label htmlFor="assignedTo">
                  Assign To
                </label>

                <select
                  id="assignedTo"
                  name="assignedTo"
                  value={form.assignedTo}
                  onChange={handleChange}
                  disabled={loadingUsers}
                  required
                >

                  <option value="">
                    {loadingUsers
                      ? "Loading users..."
                      : "Select user"}
                  </option>

                  {users.map((item) => (
                    <option
                      key={item._id}
                      value={item._id}
                    >
                      {item.name}
                    </option>
                  ))}

                </select>

              </div>
            )}

          </div>

          {/* =================================================
              Normal User Info

              This is optional UI information. It makes it
              clear that the task will be assigned to them.
             ================================================= */}

          {user?.role === "user" && (
            <div className="create-task-assignment-info">
              This task will be assigned to you.
            </div>
          )}

          {/* =========================
              Actions
          ========================= */}

          <div className="create-task-actions">

            <button
              type="button"
              className="create-task-cancel"
              onClick={handleCancel}
              disabled={creating}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="create-task-submit"
              disabled={
                creating ||
                (user?.role === "admin" && loadingUsers)
              }
            >
              {creating
                ? "Creating..."
                : "Create Task"}
            </button>

          </div>

        </form>

      </section>

    </main>
  );
};

export default CreateTask;