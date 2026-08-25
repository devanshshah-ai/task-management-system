import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTasks } from "../api/taskApi";
import apiClient from "../api/apiClient";

import "./Tasks.css";

const STATUS_OPTIONS = [
  {
    value: "all",
    label: "All Status",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "in_progress",
    label: "In Progress",
  },
  {
    value: "completed",
    label: "Completed",
  },
];

const PRIORITY_OPTIONS = [
  {
    value: "all",
    label: "All Priority",
  },
  {
    value: "high",
    label: "High",
  },
  {
    value: "medium",
    label: "Medium",
  },
  {
    value: "low",
    label: "Low",
  },
];

const SORT_OPTIONS = [
  {
    value: "asc",
    label: "Earliest First",
  },
  {
    value: "desc",
    label: "Latest First",
  },
];

const Task = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* =================================
     State
  ================================= */

  const [tasks, setTasks] = useState([]);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTasks: 0,
    limit: 10,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =================================
     Filters
  ================================= */

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");

  /*
    These represent the filters that are
    currently being used by the API.
  */
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
    sortOrder: "asc",
  });

  /* =================================
     Search Throttle
  ================================= */

  const searchThrottleRef = useRef(null);

  /* =================================
     View Modal
  ================================= */

  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  /* =================================
     Edit Modal
  ================================= */

  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "pending",
    dueDate: "",
  });

  /* =================================
     Delete
  ================================= */

  const [deletingId, setDeletingId] = useState(null);

  /* =================================
     Permissions
  ================================= */

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
      task?.assignedTo?._id ||
      task?.assignedTo?.id ||
      task?.assignedTo;

    return (
      currentUserId &&
      assignedUserId &&
      String(currentUserId) === String(assignedUserId)
    );
  };

  /* =================================
     Date Helpers
  ================================= */

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* =================================
     Status Formatting
     IMPORTANT:
     Defined before anything that uses it.
  ================================= */

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

  /* =================================
     Priority Formatting
  ================================= */

  const formatPriority = (priority) => {
    if (!priority) {
      return "Medium";
    }

    return (
      priority.charAt(0).toUpperCase() +
      priority.slice(1)
    );
  };

  /* =================================
     Overdue
  ================================= */

  const isTaskOverdue = (task) => {
    if (!task?.dueDate) {
      return false;
    }

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

  /* =================================
     Load Tasks With Filters
  ================================= */

  const loadTasksWithFilters = async ({
    page = 1,
    search: searchValue = "",
    status = "all",
    priority = "all",
    sortOrder: order = "asc",
  }) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: 10,
        search: searchValue.trim(),
        sortBy: "dueDate",
        sortOrder: order,
      };

      if (status !== "all") {
        params.status = status;
      }

      if (priority !== "all") {
        params.priority = priority;
      }

      const response = await getTasks(params);

      const data = response?.data || response;

      setTasks(data?.tasks || []);

      setPagination(
        data?.pagination || {
          currentPage: page,
          totalPages: 1,
          totalTasks: data?.tasks?.length || 0,
          limit: 10,
          hasNextPage: false,
          hasPreviousPage: false,
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

  /* =================================
     Load Using Applied Filters
  ================================= */

  const loadTasks = async (page = 1) => {
    await loadTasksWithFilters({
      page,
      search: appliedFilters.search,
      status: appliedFilters.status,
      priority: appliedFilters.priority,
      sortOrder: appliedFilters.sortOrder,
    });
  };

  /* =================================
     Initial Load
  ================================= */

  useEffect(() => {
    loadTasksWithFilters({
      page: 1,
      search: "",
      status: "all",
      priority: "all",
      sortOrder: "asc",
    });
  }, []);

  /* =================================
     Cleanup Search Throttle
  ================================= */

  useEffect(() => {
    return () => {
      if (searchThrottleRef.current) {
        clearTimeout(searchThrottleRef.current);
      }
    };
  }, []);

  /* =================================
     Apply Filters
  ================================= */

  const handleApplyFilters = () => {
    if (searchThrottleRef.current) {
      clearTimeout(searchThrottleRef.current);
    }

    const newFilters = {
      search: search.trim(),
      status: statusFilter,
      priority: priorityFilter,
      sortOrder,
    };

    setAppliedFilters(newFilters);

    loadTasksWithFilters({
      page: 1,
      ...newFilters,
    });
  };

  /* =================================
     Search
     Throttled API request
  ================================= */

  const handleSearchChange = (event) => {
    const value = event.target.value;

    setSearch(value);

    if (searchThrottleRef.current) {
      clearTimeout(searchThrottleRef.current);
    }

    searchThrottleRef.current = setTimeout(() => {
      const newFilters = {
        search: value.trim(),
        status: statusFilter,
        priority: priorityFilter,
        sortOrder,
      };

      setAppliedFilters(newFilters);

      loadTasksWithFilters({
        page: 1,
        ...newFilters,
      });
    }, 500);
  };

  /* =================================
     Search Enter
  ================================= */

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      if (searchThrottleRef.current) {
        clearTimeout(searchThrottleRef.current);
      }

      handleApplyFilters();
    }
  };

  /* =================================
     Status Filter
     Applies immediately
  ================================= */

  const handleStatusChange = (event) => {
    const value = event.target.value;

    setStatusFilter(value);

    if (searchThrottleRef.current) {
      clearTimeout(searchThrottleRef.current);
    }

    const newFilters = {
      search: search.trim(),
      status: value,
      priority: priorityFilter,
      sortOrder,
    };

    setAppliedFilters(newFilters);

    loadTasksWithFilters({
      page: 1,
      ...newFilters,
    });
  };

  /* =================================
     Priority Filter
     Applies immediately
  ================================= */

  const handlePriorityChange = (event) => {
    const value = event.target.value;

    setPriorityFilter(value);

    if (searchThrottleRef.current) {
      clearTimeout(searchThrottleRef.current);
    }

    const newFilters = {
      search: search.trim(),
      status: statusFilter,
      priority: value,
      sortOrder,
    };

    setAppliedFilters(newFilters);

    loadTasksWithFilters({
      page: 1,
      ...newFilters,
    });
  };

  /* =================================
     Due Date Sort
     Applies immediately
  ================================= */

  const handleSortChange = (event) => {
    const value = event.target.value;

    setSortOrder(value);

    if (searchThrottleRef.current) {
      clearTimeout(searchThrottleRef.current);
    }

    const newFilters = {
      search: search.trim(),
      status: statusFilter,
      priority: priorityFilter,
      sortOrder: value,
    };

    setAppliedFilters(newFilters);

    loadTasksWithFilters({
      page: 1,
      ...newFilters,
    });
  };

  /* =================================
     Clear Filters
  ================================= */

  const handleClearFilters = () => {
    if (searchThrottleRef.current) {
      clearTimeout(searchThrottleRef.current);
    }

    const clearedFilters = {
      search: "",
      status: "all",
      priority: "all",
      sortOrder: "asc",
    };

    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setSortOrder("asc");
    setAppliedFilters(clearedFilters);

    loadTasksWithFilters({
      page: 1,
      ...clearedFilters,
    });
  };

  /* =================================
     Pagination
  ================================= */

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

  /* =================================
     Task Sorting
  ================================= */

  const getTaskSortWeight = (task) => {
    const status = getDisplayStatus(task);

    switch (status) {
      case "overdue":
        return 1;

      case "pending":
        return 2;

      case "in_progress":
        return 3;

      case "completed":
        return 4;

      default:
        return 5;
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const statusWeightA = getTaskSortWeight(a);
    const statusWeightB = getTaskSortWeight(b);

    if (statusWeightA !== statusWeightB) {
      return statusWeightA - statusWeightB;
    }

    const dateA = new Date(a.dueDate).getTime();
    const dateB = new Date(b.dueDate).getTime();

    return dateA - dateB;
  });

  /* =================================
     View Task
  ================================= */

  const handleView = (task) => {
    setSelectedTask(task);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedTask(null);
  };

  /* =================================
     Edit Task
  ================================= */

  const convertToDateTimeLocal = (date) => {
    if (!date) {
      return "";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    const offset = parsedDate.getTimezoneOffset();

    const localDate = new Date(
      parsedDate.getTime() -
        offset * 60 * 1000
    );

    return localDate.toISOString().slice(0, 16);
  };

  const handleEdit = (task) => {
    if (!canManageTask(task)) {
      return;
    }

    setEditingTask(task);

    setEditForm({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "medium",
      status: task.status || "pending",
      dueDate: convertToDateTimeLocal(
        task.dueDate
      ),
    });

    setShowDetails(false);
    setSelectedTask(null);

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (updating) {
      return;
    }

    setShowEditModal(false);
    setEditingTask(null);

    setEditForm({
      title: "",
      description: "",
      priority: "medium",
      status: "pending",
      dueDate: "",
    });
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingTask) {
      return;
    }

    if (!canManageTask(editingTask)) {
      setError(
        "You do not have permission to update this task."
      );

      return;
    }

    try {
      setUpdating(true);
      setError("");

      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        priority: editForm.priority,
        status: editForm.status,
        dueDate: editForm.dueDate,
      };

      await apiClient(
        `/tasks/${editingTask._id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      closeEditModal();

      await loadTasks(
        pagination.currentPage
      );
    } catch (err) {
      console.error(
        "Update task error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to update task."
      );
    } finally {
      setUpdating(false);
    }
  };

  /* =================================
     Delete Task
  ================================= */

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
      setError("");

      await apiClient(
        `/tasks/${task._id}`,
        {
          method: "DELETE",
        }
      );

      if (
        tasks.length === 1 &&
        pagination.currentPage > 1
      ) {
        await loadTasks(
          pagination.currentPage - 1
        );
      } else {
        await loadTasks(
          pagination.currentPage
        );
      }
    } catch (err) {
      console.error(
        "Delete task error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to delete task."
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =================================
     Permissions
  ================================= */

  // NOTE:
  // canManageTask is intentionally above
  // because it is used throughout the component.

  /* =================================
     Render
  ================================= */

  return (
    <main className="task-page">

      {/* =========================
          PAGE HEADER
      ========================= */}

      <section className="task-page-header">

        <div className="task-page-heading">

          <span className="task-eyebrow">
            Task Management
          </span>

          <h1>Tasks</h1>

          <p>
            View, manage and keep track of all
            your tasks.
          </p>

        </div>

        <button
          type="button"
          className="task-create-button"
          onClick={() =>
            navigate("/tasks/create")
          }
        >
          + Create Task
        </button>

      </section>

      {/* =========================
          ERROR
      ========================= */}

      {error && (
        <div className="task-error">
          {error}
        </div>
      )}

      {/* =========================
          TASK LIST
      ========================= */}

      <section className="task-list-section">

        {/* =========================
            LIST HEADER
        ========================= */}

        <div className="task-list-header">

          <div>

            <h2>Tasks</h2>

            <p>
              {pagination.totalTasks || 0}{" "}
              {pagination.totalTasks === 1
                ? "task"
                : "tasks"}{" "}
              available
            </p>

          </div>

          <span className="task-page-indicator">
            Page {pagination.currentPage} of{" "}
            {pagination.totalPages || 1}
          </span>

        </div>

        {/* =========================
            FILTER BAR
        ========================= */}

        <div className="task-filters">

          {/* Search */}

          <div className="task-filter-search">

            <div className="task-search">

              <span className="task-search-icon">
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search tasks by title..."
              />

              {search && (
                <button
                  type="button"
                  className="task-search-clear"
                  onClick={() => {
                    setSearch("");

                    if (
                      searchThrottleRef.current
                    ) {
                      clearTimeout(
                        searchThrottleRef.current
                      );
                    }

                    const newFilters = {
                      search: "",
                      status: statusFilter,
                      priority: priorityFilter,
                      sortOrder,
                    };

                    setAppliedFilters(
                      newFilters
                    );

                    loadTasksWithFilters({
                      page: 1,
                      ...newFilters,
                    });
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}

            </div>

          </div>

          {/* Filter Controls */}

          <div className="task-filter-controls">

            {/* Status */}

            <div className="task-filter-group">

              <label htmlFor="task-status">
                Status
              </label>

              <select
                id="task-status"
                value={statusFilter}
                onChange={handleStatusChange}
              >

                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* Priority */}

            <div className="task-filter-group">

              <label htmlFor="task-priority">
                Priority
              </label>

              <select
                id="task-priority"
                value={priorityFilter}
                onChange={handlePriorityChange}
              >

                {PRIORITY_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* Due Date */}

            <div className="task-filter-group">

              <label htmlFor="task-due-date">
                Due Date
              </label>

              <select
                id="task-due-date"
                value={sortOrder}
                onChange={handleSortChange}
              >

                {SORT_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* Actions */}

            <div className="task-filter-actions">

              <button
                type="button"
                className="task-filter-apply"
                onClick={handleApplyFilters}
              >
                Apply
              </button>

              <button
                type="button"
                className="task-filter-clear"
                onClick={handleClearFilters}
              >
                Clear
              </button>

            </div>

          </div>

          {/* Active Filters */}

          {(appliedFilters.search ||
            appliedFilters.status !== "all" ||
            appliedFilters.priority !== "all" ||
            appliedFilters.sortOrder !== "asc") && (

            <div className="task-filter-summary">

              <span>
                Active filters:
              </span>

              {appliedFilters.search && (
                <span className="task-filter-badge">
                  Search:{" "}
                  {appliedFilters.search}
                </span>
              )}

              {appliedFilters.status !==
                "all" && (
                <span className="task-filter-badge">
                  Status:{" "}
                  {formatStatus(
                    appliedFilters.status
                  )}
                </span>
              )}

              {appliedFilters.priority !==
                "all" && (
                <span className="task-filter-badge">
                  Priority:{" "}
                  {formatPriority(
                    appliedFilters.priority
                  )}
                </span>
              )}

              {appliedFilters.sortOrder ===
                "desc" && (
                <span className="task-filter-badge">
                  Latest First
                </span>
              )}

            </div>
          )}

        </div>

        {/* =========================
            LOADING
        ========================= */}

        {loading && (
          <div className="task-loading">

            <div className="task-loading-spinner" />

            <p>
              Loading tasks...
            </p>

          </div>
        )}

        {/* =========================
            EMPTY STATE
        ========================= */}

        {!loading &&
          tasks.length === 0 && (

            <div className="task-empty">

              <div className="task-empty-icon">
                ✓
              </div>

              <h3>
                {appliedFilters.search ||
                appliedFilters.status !== "all" ||
                appliedFilters.priority !== "all"
                  ? "No matching tasks"
                  : "No tasks found"}
              </h3>

              <p>
                {appliedFilters.search ||
                appliedFilters.status !== "all" ||
                appliedFilters.priority !== "all"
                  ? "Try changing your search or filters."
                  : "There are currently no tasks available."}
              </p>

              {(appliedFilters.search ||
                appliedFilters.status !==
                  "all" ||
                appliedFilters.priority !==
                  "all") && (

                <button
                  type="button"
                  onClick={
                    handleClearFilters
                  }
                >
                  Clear Filters
                </button>

              )}

            </div>

          )}

        {/* =========================
            TASK CARDS
        ========================= */}

        {!loading &&
          sortedTasks.length > 0 && (

            <div className="task-list">

              {sortedTasks.map((task) => {

                const canManage =
                  canManageTask(task);

                const displayStatus =
                  getDisplayStatus(task);

                return (

                  <article
                    key={task._id}
                    className={`task-card ${
                      task.priority ||
                      "medium"
                    } ${
                      displayStatus ===
                      "overdue"
                        ? "task-card-overdue"
                        : ""
                    }`}
                  >

                    {/* LEFT SIDE */}

                    <div className="task-card-main">

                      <div className="task-card-title-row">

                        <h3>
                          {task.title}
                        </h3>

                        <span
                          className={`task-priority task-priority-${task.priority}`}
                        >
                          {formatPriority(
                            task.priority
                          )}
                        </span>

                      </div>

                      {task.description && (
                        <p
                          className="task-description"
                          title={
                            task.description
                          }
                        >
                          {task.description}
                        </p>
                      )}

                      <div className="task-card-actions">

                        {/* View */}

                        <button
                          type="button"
                          className="task-action task-action-view"
                          onClick={() =>
                            handleView(task)
                          }
                        >
                          <span className="task-action-icon">
                            ◉
                          </span>
                          View
                        </button>

                        {/* Edit */}

                        {canManage && (
                          <button
                            type="button"
                            className="task-action task-action-edit"
                            onClick={() =>
                              handleEdit(task)
                            }
                          >
                            <span className="task-action-icon">
                              ✎
                            </span>
                            Edit
                          </button>
                        )}

                        {/* Delete */}

                        {canManage && (
                          <button
                            type="button"
                            className="task-action task-action-delete"
                            disabled={
                              deletingId ===
                              task._id
                            }
                            onClick={() =>
                              handleDelete(task)
                            }
                          >
                            <span className="task-action-icon">
                              ⌫
                            </span>

                            {deletingId ===
                            task._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
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
                          className={`task-status task-status-${displayStatus}`}
                        >
                          {formatStatus(
                            displayStatus
                          )}
                        </span>

                      </div>

                      <div className="task-meta-item">

                        <span className="task-meta-label">
                          Due
                        </span>

                        <strong>
                          {formatDate(
                            task.dueDate
                          )}
                        </strong>

                      </div>

                      <div className="task-meta-item">

                        <span className="task-meta-label">
                          Assigned To
                        </span>

                        <strong>
                          {task.assignedTo
                            ?.name ||
                            "Unassigned"}
                        </strong>

                      </div>

                      <div className="task-meta-item">

                        <span className="task-meta-label">
                          Created By
                        </span>

                        <strong>
                          {task.createdBy
                            ?.name ||
                            "Unknown"}
                        </strong>

                      </div>

                    </div>

                  </article>
                );
              })}

            </div>
          )}

        {/* =========================
            PAGINATION
        ========================= */}

        {!loading &&
          pagination.totalPages > 1 && (

            <div className="task-pagination">

              <button
                type="button"
                disabled={
                  !pagination.hasPreviousPage
                }
                onClick={() =>
                  handlePageChange(
                    pagination.currentPage -
                      1
                  )
                }
              >
                ← Previous
              </button>

              <div className="task-pagination-pages">

                {Array.from(
                  {
                    length:
                      pagination.totalPages,
                  },
                  (_, index) =>
                    index + 1
                ).map((page) => (

                  <button
                    type="button"
                    key={page}
                    className={
                      page ===
                      pagination.currentPage
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      handlePageChange(page)
                    }
                  >
                    {page}
                  </button>

                ))}

              </div>

              <button
                type="button"
                disabled={
                  !pagination.hasNextPage
                }
                onClick={() =>
                  handlePageChange(
                    pagination.currentPage +
                      1
                  )
                }
              >
                Next →
              </button>

            </div>
          )}

      </section>

      {/* =================================================
          VIEW TASK MODAL
      ================================================= */}

      {showDetails &&
        selectedTask && (

          <div
            className="task-modal-overlay"
            onClick={closeDetails}
          >

            <div
              className="task-modal task-details-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="task-modal-header">

                <div className="task-modal-heading">

                  <span className="task-eyebrow">
                    Task Details
                  </span>

                  <h2>
                    {selectedTask.title}
                  </h2>

                </div>

                <button
                  type="button"
                  className="task-modal-close"
                  onClick={closeDetails}
                  aria-label="Close"
                >
                  ×
                </button>

              </div>

              <div className="task-modal-body">

                <div className="task-modal-badges">

                  <span
                    className={`task-priority task-priority-${selectedTask.priority}`}
                  >
                    {formatPriority(
                      selectedTask.priority
                    )}
                  </span>

                  <span
                    className={`task-status task-status-${getDisplayStatus(
                      selectedTask
                    )}`}
                  >
                    {formatStatus(
                      getDisplayStatus(
                        selectedTask
                      )
                    )}
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

                  <div className="task-detail-box">

                    <span>
                      Due Date
                    </span>

                    <strong>
                      {formatDateTime(
                        selectedTask.dueDate
                      )}
                    </strong>

                  </div>

                  <div className="task-detail-box">

                    <span>
                      Assigned To
                    </span>

                    <strong>
                      {selectedTask
                        .assignedTo
                        ?.name ||
                        "Unassigned"}
                    </strong>

                    {selectedTask
                      .assignedTo
                      ?.email && (
                      <small>
                        {
                          selectedTask
                            .assignedTo
                            .email
                        }
                      </small>
                    )}

                  </div>

                  <div className="task-detail-box">

                    <span>
                      Created By
                    </span>

                    <strong>
                      {selectedTask
                        .createdBy
                        ?.name ||
                        "Unknown"}
                    </strong>

                    {selectedTask
                      .createdBy
                      ?.email && (
                      <small>
                        {
                          selectedTask
                            .createdBy
                            .email
                        }
                      </small>
                    )}

                  </div>

                  <div className="task-detail-box">

                    <span>
                      Created At
                    </span>

                    <strong>
                      {formatDateTime(
                        selectedTask.createdAt
                      )}
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

                {canManageTask(
                  selectedTask
                ) && (

                  <button
                    type="button"
                    className="task-modal-edit-button"
                    onClick={() =>
                      handleEdit(
                        selectedTask
                      )
                    }
                  >
                    Edit Task
                  </button>

                )}

              </div>

            </div>

          </div>
        )}

      {/* =================================================
          EDIT TASK MODAL
      ================================================= */}

      {showEditModal &&
        editingTask && (

          <div
            className="task-modal-overlay"
            onClick={closeEditModal}
          >

            <div
              className="task-modal task-edit-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="task-modal-header">

                <div className="task-modal-heading">

                  <span className="task-eyebrow">
                    Task Management
                  </span>

                  <h2>
                    Edit Task
                  </h2>

                  <p>
                    Update the details of this
                    task.
                  </p>

                </div>

                <button
                  type="button"
                  className="task-modal-close"
                  onClick={closeEditModal}
                  disabled={updating}
                  aria-label="Close"
                >
                  ×
                </button>

              </div>

              <form
                className="task-edit-form"
                onSubmit={handleUpdate}
              >

                <div className="task-edit-form-group">

                  <label htmlFor="edit-title">
                    Task Title
                  </label>

                  <input
                    id="edit-title"
                    name="title"
                    type="text"
                    value={
                      editForm.title
                    }
                    onChange={
                      handleEditChange
                    }
                    placeholder="Enter task title"
                    maxLength={100}
                    required
                  />

                </div>

                <div className="task-edit-form-group">

                  <label htmlFor="edit-description">
                    Description
                  </label>

                  <textarea
                    id="edit-description"
                    name="description"
                    value={
                      editForm.description
                    }
                    onChange={
                      handleEditChange
                    }
                    placeholder="Describe the task..."
                    maxLength={1000}
                    rows={5}
                  />

                  <span className="task-form-hint">
                    {
                      editForm.description
                        .length
                    }
                    /1000
                  </span>

                </div>

                <div className="task-edit-form-grid">

                  <div className="task-edit-form-group">

                    <label htmlFor="edit-priority">
                      Priority
                    </label>

                    <select
                      id="edit-priority"
                      name="priority"
                      value={
                        editForm.priority
                      }
                      onChange={
                        handleEditChange
                      }
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

                  <div className="task-edit-form-group">

                    <label htmlFor="edit-status">
                      Status
                    </label>

                    <select
                      id="edit-status"
                      name="status"
                      value={
                        editForm.status
                      }
                      onChange={
                        handleEditChange
                      }
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

                </div>

                <div className="task-edit-form-group">

                  <label htmlFor="edit-dueDate">
                    Due Date
                  </label>

                  <input
                    id="edit-dueDate"
                    name="dueDate"
                    type="datetime-local"
                    value={
                      editForm.dueDate
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                  />

                </div>

                <div className="task-edit-footer">

                  <button
                    type="button"
                    className="task-modal-close-button"
                    onClick={
                      closeEditModal
                    }
                    disabled={updating}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="task-modal-edit-button"
                    disabled={updating}
                  >
                    {updating
                      ? "Saving Changes..."
                      : "Save Changes"}
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

    </main>
  );
};

export default Task;