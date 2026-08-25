import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { getTasks } from "../api/taskApi";
import { getUsers } from "../api/userApi";
import apiClient from "../api/apiClient";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import "./Tasks.css";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_LIMIT = 10;
const SEARCH_DELAY = 500;

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
    label: "All Priorities",
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

const DEFAULT_FILTERS = {
  search: "",
  status: "all",
  priority: "all",
  sortOrder: "asc",
};

const DEFAULT_EDIT_FORM = {
  title: "",
  description: "",
  priority: "medium",
  status: "pending",
  dueDate: "",
  assignedTo: "",
};

/* =========================================================
   COMPONENT
========================================================= */

const Task = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* =======================================================
     STATE
  ======================================================= */

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTasks: 0,
    limit: PAGE_LIMIT,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =======================================================
     FILTER STATE
  ======================================================= */

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");

  const [appliedFilters, setAppliedFilters] = useState(
    DEFAULT_FILTERS
  );

  const searchThrottleRef = useRef(null);

  /* =======================================================
     VIEW MODAL
  ======================================================= */

  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  /* =======================================================
     EDIT MODAL
  ======================================================= */

  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [editForm, setEditForm] = useState({
    ...DEFAULT_EDIT_FORM,
  });

  /* =======================================================
     DELETE
  ======================================================= */

  const [deletingId, setDeletingId] = useState(null);

  /* =======================================================
     PERMISSIONS
  ======================================================= */

  const isAdmin = user?.role === "admin";

  const getUserId = useCallback(() => {
    return user?._id || user?.id;
  }, [user]);

  const canManageTask = useCallback(
    (task) => {
      if (!task) {
        return false;
      }

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
    },
    [getUserId, isAdmin]
  );

  /* =======================================================
     ERROR HELPER
  ======================================================= */

  const getErrorMessage = (err, fallback) => {
    return (
      err?.response?.data?.message ||
      err?.message ||
      fallback
    );
  };

  /* =======================================================
     LOAD USERS
  ======================================================= */

  const loadUsers = useCallback(async () => {
    try {
      const response = await getUsers();

      const data = response?.data || response;

      const receivedUsers = data?.users || [];

      setUsers(receivedUsers);

      console.log("USERS LOADED:", receivedUsers);
    } catch (err) {
      console.error("Unable to load users:", err);
    }
  }, []);

  /* =======================================================
     BUILD TASK QUERY
  ======================================================= */

  const buildTaskParams = useCallback(
    (page = 1, filters = appliedFilters) => {
      const params = {
        page,
        limit: PAGE_LIMIT,
        search: filters.search.trim(),
        sortBy: "dueDate",
        sortOrder: filters.sortOrder,
      };

      if (filters.status !== "all") {
        params.status = filters.status;
      }

      if (filters.priority !== "all") {
        params.priority = filters.priority;
      }

      return params;
    },
    [appliedFilters]
  );

  /* =======================================================
     LOAD TASKS
  ======================================================= */

  const loadTasks = useCallback(
    async (page = 1, filters = appliedFilters) => {
      try {
        setLoading(true);
        setError("");

        const params = buildTaskParams(page, filters);

        const response = await getTasks(params);

        const data = response?.data || response;

        const receivedTasks = data?.tasks || [];

        setTasks(receivedTasks);

        setPagination(
          data?.pagination || {
            currentPage: page,
            totalPages: 1,
            totalTasks: receivedTasks.length,
            limit: PAGE_LIMIT,
            hasNextPage: false,
            hasPreviousPage: false,
          }
        );
      } catch (err) {
        console.error("Task loading error:", err);

        setError(
          getErrorMessage(
            err,
            "Unable to load tasks."
          )
        );

        setTasks([]);
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters, buildTaskParams]
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /* =======================================================
     LOAD TASKS WHEN FILTERS CHANGE
  ======================================================= */

  useEffect(() => {
    loadTasks(1, appliedFilters);
  }, [appliedFilters, loadTasks]);

  /* =======================================================
     CLEANUP SEARCH TIMER
  ======================================================= */

  useEffect(() => {
    return () => {
      if (searchThrottleRef.current) {
        clearTimeout(searchThrottleRef.current);
      }
    };
  }, []);

  /* =======================================================
     APPLY FILTERS
  ======================================================= */

  const handleApplyFilters = () => {
    setAppliedFilters({
      search: search.trim(),
      status: statusFilter,
      priority: priorityFilter,
      sortOrder,
    });
  };

  /* =======================================================
     STATUS FILTER
  ======================================================= */

  const handleStatusChange = (event) => {
    const value = event.target.value;

    setStatusFilter(value);

    setAppliedFilters((previous) => ({
      ...previous,
      status: value,
    }));
  };

  /* =======================================================
     PRIORITY FILTER
  ======================================================= */

  const handlePriorityChange = (event) => {
    const value = event.target.value;

    setPriorityFilter(value);

    setAppliedFilters((previous) => ({
      ...previous,
      priority: value,
    }));
  };

  /* =======================================================
     SORT FILTER
  ======================================================= */

  const handleSortChange = (event) => {
    const value = event.target.value;

    setSortOrder(value);

    setAppliedFilters((previous) => ({
      ...previous,
      sortOrder: value,
    }));
  };

  /* =======================================================
     SEARCH
  ======================================================= */

  const handleSearchChange = (event) => {
    const value = event.target.value;

    setSearch(value);

    if (searchThrottleRef.current) {
      clearTimeout(searchThrottleRef.current);
    }

    searchThrottleRef.current = setTimeout(() => {
      setAppliedFilters((previous) => ({
        ...previous,
        search: value.trim(),
      }));
    }, SEARCH_DELAY);
  };

  /* =======================================================
     SEARCH ENTER
  ======================================================= */

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    if (searchThrottleRef.current) {
      clearTimeout(searchThrottleRef.current);
    }

    setAppliedFilters((previous) => ({
      ...previous,
      search: search.trim(),
    }));
  };

  /* =======================================================
     CLEAR SEARCH
  ======================================================= */

  const handleClearSearch = () => {
    if (searchThrottleRef.current) {
      clearTimeout(searchThrottleRef.current);
    }

    setSearch("");

    setAppliedFilters((previous) => ({
      ...previous,
      search: "",
    }));
  };

  /* =======================================================
     CLEAR ALL FILTERS
  ======================================================= */

  const handleClearFilters = () => {
    if (searchThrottleRef.current) {
      clearTimeout(searchThrottleRef.current);
    }

    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setSortOrder("asc");

    setAppliedFilters({
      ...DEFAULT_FILTERS,
    });
  };

  /* =======================================================
     PAGINATION
  ======================================================= */

  const handlePageChange = (page) => {
    if (
      page < 1 ||
      page > pagination.totalPages ||
      page === pagination.currentPage
    ) {
      return;
    }

    loadTasks(page, appliedFilters);
  };

  /* =======================================================
     DATE HELPERS
  ======================================================= */

  const parseDate = (date) => {
    if (!date) {
      return null;
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  };

  const formatDate = (date) => {
    const parsedDate = parseDate(date);

    if (!parsedDate) {
      return "—";
    }

    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    const parsedDate = parseDate(date);

    if (!parsedDate) {
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

  /* =======================================================
     DATETIME LOCAL CONVERSION
  ======================================================= */

  const convertToDateTimeLocal = (date) => {
    if (!date) {
      return "";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      console.log(
        "Invalid due date received:",
        date
      );

      return "";
    }

    const year = parsedDate.getFullYear();

    const month = String(
      parsedDate.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      parsedDate.getDate()
    ).padStart(2, "0");

    const hours = String(
      parsedDate.getHours()
    ).padStart(2, "0");

    const minutes = String(
      parsedDate.getMinutes()
    ).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  /* =======================================================
     OVERDUE
  ======================================================= */

  const isTaskOverdue = (task) => {
    const dueDate = parseDate(task?.dueDate);

    if (!dueDate) {
      return false;
    }

    if (task.status === "completed") {
      return false;
    }

    return dueDate.getTime() < Date.now();
  };

  const getDisplayStatus = (task) => {
    if (isTaskOverdue(task)) {
      return "overdue";
    }

    return task?.status || "pending";
  };

  /* =======================================================
     TASK SORTING
  ======================================================= */

  const getTaskSortWeight = (task) => {
    switch (getDisplayStatus(task)) {
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

  const sortedTasks = [...tasks].sort(
    (a, b) => {
      const statusWeightA =
        getTaskSortWeight(a);

      const statusWeightB =
        getTaskSortWeight(b);

      if (
        statusWeightA !==
        statusWeightB
      ) {
        return (
          statusWeightA -
          statusWeightB
        );
      }

      const dateA =
        parseDate(a.dueDate)?.getTime() ||
        Number.MAX_SAFE_INTEGER;

      const dateB =
        parseDate(b.dueDate)?.getTime() ||
        Number.MAX_SAFE_INTEGER;

      return dateA - dateB;
    }
  );

  /* =======================================================
     FORMATTING
  ======================================================= */

  const formatStatus = (status) => {
    if (!status) {
      return "Unknown";
    }

    if (status === "overdue") {
      return "Overdue";
    }

    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase()
      );
  };

  const formatPriority = (priority) => {
    if (!priority) {
      return "Medium";
    }

    return (
      priority.charAt(0).toUpperCase() +
      priority.slice(1)
    );
  };

  /* =======================================================
     VIEW TASK
  ======================================================= */

  const handleView = (task) => {
    setSelectedTask(task);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedTask(null);
  };

  /* =======================================================
     EDIT TASK
  ======================================================= */

  const handleEdit = (task) => {
    console.log(
      "EDIT TASK OBJECT:",
      task
    );

    if (!canManageTask(task)) {
      return;
    }

    /*
      assignedTo can come from the API in different formats:

      1. assignedTo: {
           _id: "...",
           name: "John"
         }

      2. assignedTo: {
           id: "...",
           name: "John"
         }

      3. assignedTo: "MongoDB ObjectId"
    */

    const assignedUserId =
      task?.assignedTo?._id ||
      task?.assignedTo?.id ||
      task?.assignedTo ||
      "";

    const editData = {
      title: task?.title ?? "",

      description:
        task?.description ?? "",

      priority:
        task?.priority ?? "medium",

      status:
        task?.status ?? "pending",

      dueDate:
        convertToDateTimeLocal(
          task?.dueDate
        ),

      assignedTo:
        assignedUserId
          ? String(assignedUserId)
          : "",
    };

    console.log(
      "EDIT FORM DATA:",
      editData
    );

    console.log(
      "ASSIGNED USER ID:",
      assignedUserId
    );

    console.log(
      "AVAILABLE USERS:",
      users
    );

    setEditingTask(task);

    setEditForm(editData);

    setShowDetails(false);
    setSelectedTask(null);

    setShowEditModal(true);
  };

  /* =======================================================
     CLOSE EDIT MODAL
  ======================================================= */

  const closeEditModal = () => {
    if (updating) {
      return;
    }

    setShowEditModal(false);
    setEditingTask(null);

    setEditForm({
      ...DEFAULT_EDIT_FORM,
    });
  };

  /* =======================================================
     EDIT FORM CHANGE
  ======================================================= */

  const handleEditChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =======================================================
     UPDATE TASK
  ======================================================= */

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
        title:
          editForm.title.trim(),

        description:
          editForm.description.trim(),

        priority:
          editForm.priority,

        status:
          editForm.status,

        dueDate:
          editForm.dueDate,

        assignedTo:
          editForm.assignedTo || null,
      };

      console.log(
        "UPDATE PAYLOAD:",
        payload
      );

      await apiClient(
        `/tasks/${editingTask._id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      setShowEditModal(false);
      setEditingTask(null);

      setEditForm({
        ...DEFAULT_EDIT_FORM,
      });

      await loadTasks(
        pagination.currentPage,
        appliedFilters
      );
    } catch (err) {
      console.error(
        "Update task error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to update task."
        )
      );
    } finally {
      setUpdating(false);
    }
  };

  /* =======================================================
     DELETE TASK
  ======================================================= */

  const handleDelete = async (task) => {
    if (!canManageTask(task)) {
      return;
    }

    const confirmed =
      window.confirm(
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

      const shouldMoveBack =
        tasks.length === 1 &&
        pagination.currentPage > 1;

      const nextPage =
        shouldMoveBack
          ? pagination.currentPage - 1
          : pagination.currentPage;

      await loadTasks(
        nextPage,
        appliedFilters
      );
    } catch (err) {
      console.error(
        "Delete task error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to delete task."
        )
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =======================================================
     EXPORT DATA
  ======================================================= */

  const getExportTasks = async () => {
    try {
      setError("");

      const params =
        buildTaskParams(
          1,
          appliedFilters
        );

      params.limit = 10000;

      const response =
        await getTasks(params);

      const data =
        response?.data || response;

      return data?.tasks || [];
    } catch (err) {
      console.error(
        "Export tasks error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to export tasks."
        )
      );

      return [];
    }
  };

  /* =======================================================
     EXPORT ROWS
  ======================================================= */

  const getExportRows = (
    exportTasks
  ) => {
    return exportTasks.map(
      (task) => ({
        Title:
          task.title || "",

        Description:
          task.description || "",

        Priority:
          formatPriority(
            task.priority
          ),

        Status:
          formatStatus(
            getDisplayStatus(task)
          ),

        "Due Date":
          formatDateTime(
            task.dueDate
          ),

        "Assigned To":
          task.assignedTo?.name ||
          "Unassigned",

        "Created By":
          task.createdBy?.name ||
          "Unknown",

        "Created At":
          formatDateTime(
            task.createdAt
          ),
      })
    );
  };

  /* =======================================================
     EXPORT EXCEL
  ======================================================= */

  const handleExportExcel =
    async () => {
      const exportTasks =
        await getExportTasks();

      if (
        exportTasks.length === 0
      ) {
        setError(
          "There are no tasks available to export."
        );

        return;
      }

      const rows =
        getExportRows(
          exportTasks
        );

      const worksheet =
        XLSX.utils.json_to_sheet(
          rows
        );

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Tasks"
      );

      XLSX.writeFile(
        workbook,
        `tasks-${
          new Date()
            .toISOString()
            .split("T")[0]
        }.xlsx`
      );
    };

  /* =======================================================
     EXPORT PDF
  ======================================================= */

  const handleExportPDF =
    async () => {
      const exportTasks =
        await getExportTasks();

      if (
        exportTasks.length === 0
      ) {
        setError(
          "There are no tasks available to export."
        );

        return;
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      doc.setFontSize(18);

      doc.text(
        "Task Management Report",
        14,
        15
      );

      doc.setFontSize(9);

      doc.text(
        `Generated: ${new Date().toLocaleString(
          "en-GB"
        )}`,
        14,
        22
      );

      const rows =
        exportTasks.map(
          (task) => [
            task.title || "",

            formatPriority(
              task.priority
            ),

            formatStatus(
              getDisplayStatus(task)
            ),

            formatDate(
              task.dueDate
            ),

            task.assignedTo?.name ||
              "Unassigned",

            task.createdBy?.name ||
              "Unknown",
          ]
        );

      autoTable(doc, {
        startY: 28,

        head: [
          [
            "Title",
            "Priority",
            "Status",
            "Due Date",
            "Assigned To",
            "Created By",
          ],
        ],

        body: rows,

        styles: {
          fontSize: 8,
          cellPadding: 3,
        },

        headStyles: {
          fontSize: 8,
        },

        columnStyles: {
          0: {
            cellWidth: 55,
          },

          1: {
            cellWidth: 25,
          },

          2: {
            cellWidth: 30,
          },

          3: {
            cellWidth: 35,
          },

          4: {
            cellWidth: 45,
          },

          5: {
            cellWidth: 45,
          },
        },
      });

      doc.save(
        `tasks-${
          new Date()
            .toISOString()
            .split("T")[0]
        }.pdf`
      );
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="task-page">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <section className="task-page-header">

        <div className="task-page-heading">

          <span className="task-eyebrow">
            Task Management
          </span>

          <h1>Tasks</h1>

          <p>
            View, manage and keep track
            of all your tasks.
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

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="task-error">
          {error}
        </div>
      )}

      {/* =================================================
          TASK LIST
      ================================================= */}

      <section className="task-list-section">

        {/* =================================================
            LIST HEADER
        ================================================= */}

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

          <div className="task-header-actions">

            <button
              type="button"
              className="task-export-button task-export-excel"
              onClick={
                handleExportExcel
              }
              disabled={loading}
            >
              Export Excel
            </button>

            <button
              type="button"
              className="task-export-button task-export-pdf"
              onClick={
                handleExportPDF
              }
              disabled={loading}
            >
              Export PDF
            </button>

            <span className="task-page-indicator">
              Page{" "}
              {pagination.currentPage} of{" "}
              {pagination.totalPages || 1}
            </span>

          </div>

        </div>

        {/* =================================================
            FILTER BAR
        ================================================= */}

        <div className="task-filters">

          <div className="task-filter-search">

            <div className="task-search">

              <span className="task-search-icon">
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={
                  handleSearchChange
                }
                onKeyDown={
                  handleSearchKeyDown
                }
                placeholder="Search tasks by title..."
              />

              {search && (
                <button
                  type="button"
                  className="task-search-clear"
                  onClick={
                    handleClearSearch
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}

            </div>

          </div>

          <div className="task-filter-controls">

            <div className="task-filter-group">

              <label htmlFor="task-status">
                Status
              </label>

              <select
                id="task-status"
                value={statusFilter}
                onChange={
                  handleStatusChange
                }
              >
                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

            </div>

            <div className="task-filter-group">

              <label htmlFor="task-priority">
                Priority
              </label>

              <select
                id="task-priority"
                value={
                  priorityFilter
                }
                onChange={
                  handlePriorityChange
                }
              >
                {PRIORITY_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

            </div>

            <div className="task-filter-group">

              <label htmlFor="task-due-date">
                Due Date
              </label>

              <select
                id="task-due-date"
                value={sortOrder}
                onChange={
                  handleSortChange
                }
              >
                {SORT_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

            </div>

            <div className="task-filter-actions">

              <button
                type="button"
                className="task-filter-apply"
                onClick={
                  handleApplyFilters
                }
              >
                Apply
              </button>

              <button
                type="button"
                className="task-filter-clear"
                onClick={
                  handleClearFilters
                }
              >
                Clear
              </button>

            </div>

          </div>

          {(appliedFilters.search ||
            appliedFilters.status !==
              "all" ||
            appliedFilters.priority !==
              "all" ||
            appliedFilters.sortOrder !==
              "asc") && (

            <div className="task-filter-summary">

              <span>
                Active filters:
              </span>

              {appliedFilters.search && (
                <span className="task-filter-badge">
                  Search:{" "}
                  {
                    appliedFilters.search
                  }
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

        {/* =================================================
            FILTER INFORMATION
        ================================================= */}

        {(appliedFilters.search ||
          appliedFilters.status !==
            "all" ||
          appliedFilters.priority !==
            "all") && (

          <div className="task-active-filters">

            <span>
              Filters applied
            </span>

            {appliedFilters.search && (
              <span className="task-filter-chip">
                Search: "
                {
                  appliedFilters.search
                }
                "
              </span>
            )}

            {appliedFilters.status !==
              "all" && (
              <span className="task-filter-chip">
                Status:{" "}
                {formatStatus(
                  appliedFilters.status
                )}
              </span>
            )}

            {appliedFilters.priority !==
              "all" && (
              <span className="task-filter-chip">
                Priority:{" "}
                {formatPriority(
                  appliedFilters.priority
                )}
              </span>
            )}

          </div>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <div className="task-loading">

            <div className="task-loading-spinner" />

            <p>
              Loading tasks...
            </p>

          </div>
        )}

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {!loading &&
          tasks.length === 0 && (

            <div className="task-empty">

              <div className="task-empty-icon">
                ✓
              </div>

              <h3>
                {appliedFilters.search ||
                appliedFilters.status !==
                  "all" ||
                appliedFilters.priority !==
                  "all"
                  ? "No matching tasks"
                  : "No tasks found"}
              </h3>

              <p>
                {appliedFilters.search ||
                appliedFilters.status !==
                  "all" ||
                appliedFilters.priority !==
                  "all"
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

        {/* =================================================
            TASK CARDS
        ================================================= */}

        {!loading &&
          sortedTasks.length > 0 && (

            <div className="task-list">

              {sortedTasks.map(
                (task) => {
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
                            {
                              task.description
                            }
                          </p>
                        )}

                        <div className="task-card-actions">

                          <button
                            type="button"
                            className="task-action task-action-view"
                            onClick={() =>
                              handleView(
                                task
                              )
                            }
                          >
                            <span className="task-action-icon">
                              ◉
                            </span>
                            View
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              className="task-action task-action-edit"
                              onClick={() =>
                                handleEdit(
                                  task
                                )
                              }
                            >
                              <span className="task-action-icon">
                                ✎
                              </span>
                              Edit
                            </button>
                          )}

                          {canManage && (
                            <button
                              type="button"
                              className="task-action task-action-delete"
                              disabled={
                                deletingId ===
                                task._id
                              }
                              onClick={() =>
                                handleDelete(
                                  task
                                )
                              }
                            >
                              <span
                                className="task-action-icon"
                                aria-hidden="true"
                              >
                                🗑
                              </span>

                              {deletingId ===
                              task._id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          )}

                        </div>

                      </div>

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
                }
              )}

            </div>
          )}

        {/* =================================================
            PAGINATION
        ================================================= */}

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
                      handlePageChange(
                        page
                      )
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
                  onClick={
                    closeDetails
                  }
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
                  onClick={
                    closeDetails
                  }
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
                    Update the details of
                    this task.
                  </p>

                </div>

                <button
                  type="button"
                  className="task-modal-close"
                  onClick={
                    closeEditModal
                  }
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

                {/* =================================================
                    TITLE
                ================================================= */}

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

                {/* =================================================
                    DESCRIPTION
                ================================================= */}

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

                {/* =================================================
                    PRIORITY + STATUS
                ================================================= */}

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

                {/* =================================================
                    ASSIGNED TO
                ================================================= */}

                <div className="task-edit-form-group">

                  <label htmlFor="edit-assignedTo">
                    Assigned To
                  </label>

                  <select
                    id="edit-assignedTo"
                    name="assignedTo"
                    value={
                      editForm.assignedTo
                    }
                    onChange={
                      handleEditChange
                    }
                  >

                    <option value="">
                      Unassigned
                    </option>

                    {users.map(
                      (availableUser) => {

                        const userId =
                          availableUser?._id ||
                          availableUser?.id;

                        if (!userId) {
                          return null;
                        }

                        return (
                          <option
                            key={userId}
                            value={String(
                              userId
                            )}
                          >
                            {availableUser?.name ||
                              availableUser?.email ||
                              "Unnamed User"}
                          </option>
                        );
                      }
                    )}

                  </select>

                  {users.length === 0 && (
                    <span className="task-form-hint">
                      No users available.
                    </span>
                  )}

                </div>

                {/* =================================================
                    DUE DATE
                ================================================= */}

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

                {/* =================================================
                    FOOTER
                ================================================= */}

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