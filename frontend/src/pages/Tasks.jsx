import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { getTasks } from "../api/taskApi";
import apiClient from "../api/apiClient";

import "./Tasks.css";

const Task = () => {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTasks: 0,
    limit: 10,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const isAdmin = user?.role === "admin";

  const getUserId = () => {
    return user?._id || user?.id;
  };

  const canManageTask = (task) => {
    if (isAdmin) {
      return true;
    }

    const currentUserId = getUserId();

    const assignedUserId =
      task?.assignedTo?._id || task?.assignedTo?.id || task?.assignedTo;

    return (
      currentUserId &&
      assignedUserId &&
      String(currentUserId) === String(assignedUserId)
    );
  };

  const loadTasks = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const response = await getTasks({
        page,
        limit: 10,
      });

      const data = response?.data || response;

      setTasks(data?.tasks || []);

      setPagination(
        data?.pagination || {
          currentPage: page,
          totalPages: 1,
          totalTasks: data?.tasks?.length || 0,
          limit: 10,
        }
      );
    } catch (err) {
      console.error("Task loading error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load tasks."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks(1);
  }, []);

  const handlePageChange = (page) => {
    if (
      page < 1 ||
      page > pagination.totalPages ||
      page === pagination.currentPage
    ) {
      return;
    }

    loadTasks(page);
  };

  const handleView = (task) => {
    setSelectedTask(task);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedTask(null);
  };

  const handleEdit = (task) => {
    /*
      We will connect this to the Edit Task modal/page next.
      Keeping this isolated prevents the existing layout from breaking.
    */

    console.log("Edit task:", task);
  };

  const handleDelete = async (task) => {
    if (!canManageTask(task)) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(task._id);

      await apiClient(`/tasks/${task._id}`, {
        method: "DELETE",
      });

      await loadTasks(pagination.currentPage);
    } catch (err) {
      console.error("Delete task error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to delete task."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

    const isTaskOverdue = (task) => {
        if (!task?.dueDate) {
            return false;
        }

        // Completed tasks should never be shown as overdue
        if (task.status === "completed") {
            return false;
        }

        return new Date(task.dueDate).getTime() < Date.now();
    };

    const getDisplayStatus = (task) => {
        if (isTaskOverdue(task)) {
            return "overdue";
        }

        return task.status || "pending";
    };


    const formatStatus = (status) => {
        if (!status) {
            return "Unknown";
        }

        if (status === "overdue") {
            return "Overdue";
        }

        return status
            .replace("_", " ")
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };

  const formatPriority = (priority) => {
    if (!priority) {
      return "Medium";
    }

    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  return (
    <main className="task-page">
      {/* =========================
          Page Header
      ========================= */}

      <section className="task-page-header">
        <div className="task-page-heading">
          <span className="task-eyebrow">Task Management</span>

          <h1>Tasks</h1>

          <p>
            View, manage and keep track of all your tasks.
          </p>
        </div>

        <button
          type="button"
          className="task-create-button"
          onClick={() => console.log("Create task")}
        >
          + Create Task
        </button>
      </section>

      {/* =========================
          Error
      ========================= */}

      {error && (
        <div className="task-error">
          {error}
        </div>
      )}

      {/* =========================
          Task Section Header
      ========================= */}

      <section className="task-list-section">
        <div className="task-list-header">
          <div>
            <h2>All Tasks</h2>

            <p>
              {pagination.totalTasks || 0}{" "}
              {pagination.totalTasks === 1 ? "task" : "tasks"} available
            </p>
          </div>

          <span className="task-page-indicator">
            Page {pagination.currentPage} of{" "}
            {pagination.totalPages || 1}
          </span>
        </div>

        {/* =========================
            Loading
        ========================= */}

        {loading && (
          <div className="task-loading">
            <div className="task-loading-spinner"></div>

            <p>Loading tasks...</p>
          </div>
        )}

        {/* =========================
            Empty
        ========================= */}

        {!loading && tasks.length === 0 && (
          <div className="task-empty">
            <div className="task-empty-icon">✓</div>

            <h3>No tasks found</h3>

            <p>
              There are currently no tasks available.
            </p>
          </div>
        )}

        {/* =========================
            Task Cards
        ========================= */}

        {!loading && tasks.length > 0 && (
          <div className="task-list">
            {tasks.map((task) => {
              const canManage = canManageTask(task);

              return (
                <article
                  key={task._id}
                  className={`task-card ${
                    task.priority || "medium"
                  }`}
                >
                  {/* LEFT SIDE */}

                  <div className="task-card-main">
                    <div className="task-card-title-row">
                      <h3>{task.title}</h3>

                      <span
                        className={`task-priority task-priority-${task.priority}`}
                      >
                        {formatPriority(task.priority)}
                      </span>
                    </div>

                    {task.description && (
                      <p className="task-description">
                        {task.description}
                      </p>
                    )}

                    <div className="task-card-actions">
                      <button
                        type="button"
                        className="task-action task-action-view"
                        onClick={() => handleView(task)}
                      >
                        View
                      </button>

                      {canManage && (
                        <>
                          <button
                            type="button"
                            className="task-action task-action-edit"
                            onClick={() => handleEdit(task)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="task-action task-action-delete"
                            disabled={deletingId === task._id}
                            onClick={() => handleDelete(task)}
                          >
                            {deletingId === task._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* RIGHT SIDE */}

                  <div className="task-card-meta">
                    <div className="task-meta-item">
                      <span className="task-meta-label">
                        Status
                      </span>

                        <span
                            className={`task-status task-status-${getDisplayStatus(task)}`}
                            >
                            {formatStatus(getDisplayStatus(task))}
                        </span>
                    </div>

                    <div className="task-meta-item">
                      <span className="task-meta-label">
                        Due
                      </span>

                      <strong>
                        {formatDate(task.dueDate)}
                      </strong>
                    </div>

                    <div className="task-meta-item">
                      <span className="task-meta-label">
                        Assigned To
                      </span>

                      <strong>
                        {task.assignedTo?.name || "Unassigned"}
                      </strong>
                    </div>

                    <div className="task-meta-item">
                      <span className="task-meta-label">
                        Created By
                      </span>

                      <strong>
                        {task.createdBy?.name || "Unknown"}
                      </strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* =========================
            Pagination
        ========================= */}

        {!loading && pagination.totalPages > 1 && (
          <div className="task-pagination">
            <button
              type="button"
              disabled={!pagination.hasPreviousPage}
              onClick={() =>
                handlePageChange(
                  pagination.currentPage - 1
                )
              }
            >
              ← Previous
            </button>

            <div className="task-pagination-pages">
              {Array.from(
                { length: pagination.totalPages },
                (_, index) => index + 1
              ).map((page) => (
                <button
                  type="button"
                  key={page}
                  className={
                    page === pagination.currentPage
                      ? "active"
                      : ""
                  }
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={!pagination.hasNextPage}
              onClick={() =>
                handlePageChange(
                  pagination.currentPage + 1
                )
              }
            >
              Next →
            </button>
          </div>
        )}
      </section>

      {/* =========================
          Task Details Modal
      ========================= */}

      {showDetails && selectedTask && (
        <div
          className="task-modal-overlay"
          onClick={closeDetails}
        >
          <div
            className="task-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="task-modal-header">
              <div>
                <span className="task-eyebrow">
                  Task Details
                </span>

                <h2>{selectedTask.title}</h2>
              </div>

              <button
                type="button"
                className="task-modal-close"
                onClick={closeDetails}
              >
                ×
              </button>
            </div>

            <div className="task-modal-body">
              <div className="task-modal-priority-row">
                <span
                  className={`task-priority task-priority-${selectedTask.priority}`}
                >
                  {formatPriority(selectedTask.priority)}
                </span>

                    <span
                        className={`task-status task-status-${getDisplayStatus(selectedTask)}`}
                        >
                        {formatStatus(getDisplayStatus(selectedTask))}
                    </span>
              </div>

              <div className="task-modal-description">
                <span className="task-modal-label">
                  Description
                </span>

                <p>
                  {selectedTask.description ||
                    "No description provided."}
                </p>
              </div>

              <div className="task-modal-grid">
                <div>
                  <span>Due Date</span>
                  <strong>
                    {formatDate(selectedTask.dueDate)}
                  </strong>
                </div>

                <div>
                  <span>Assigned To</span>
                  <strong>
                    {selectedTask.assignedTo?.name ||
                      "Unassigned"}
                  </strong>
                </div>

                <div>
                  <span>Created By</span>
                  <strong>
                    {selectedTask.createdBy?.name ||
                      "Unknown"}
                  </strong>
                </div>

                <div>
                  <span>Created At</span>
                  <strong>
                    {formatDate(selectedTask.createdAt)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="task-modal-footer">
              <button
                type="button"
                className="task-modal-close-button"
                onClick={closeDetails}
              >
                Close
              </button>

              {canManageTask(selectedTask) && (
                <>
                  <button
                    type="button"
                    className="task-action task-action-edit"
                    onClick={() => {
                      closeDetails();
                      handleEdit(selectedTask);
                    }}
                  >
                    Edit Task
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Task;