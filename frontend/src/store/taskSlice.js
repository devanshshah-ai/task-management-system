import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import apiClient from "../api/apiClient";

// =====================================================
// FETCH TASKS
// =====================================================

export const fetchTasks = createAsyncThunk(
  "tasks/fetchTasks",

  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString();

      const response = await apiClient(
        query ? `/tasks?${query}` : "/tasks"
      );

      return response?.data || {};
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load tasks."
      );
    }
  }
);

// =====================================================
// INITIAL STATE
// =====================================================

const initialState = {
  tasks: [],

  loading: false,

  error: "",

  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalTasks: 0,
    limit: 10,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

// =====================================================
// SLICE
// =====================================================

const taskSlice = createSlice({
  name: "tasks",

  initialState,

  reducers: {
    // =================================================
    // SET TASKS
    // =================================================

    setTasks: (state, action) => {
      state.tasks = action.payload.tasks || [];

      state.pagination =
        action.payload.pagination ||
        initialState.pagination;
    },

    // =================================================
    // ADD TASK
    // =================================================

    addTaskToStore: (state, action) => {
      state.tasks.unshift(action.payload);

      state.pagination.totalTasks += 1;
    },

    // =================================================
    // UPDATE TASK
    // =================================================

    updateTaskInStore: (state, action) => {
      const index = state.tasks.findIndex(
        (task) => task._id === action.payload._id
      );

      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },

    // =================================================
    // DELETE TASK
    // =================================================

    deleteTaskFromStore: (state, action) => {
      state.tasks = state.tasks.filter(
        (task) => task._id !== action.payload
      );

      if (state.pagination.totalTasks > 0) {
        state.pagination.totalTasks -= 1;
      }
    },

    // =================================================
    // LOADING
    // =================================================

    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    // =================================================
    // ERROR
    // =================================================

    setError: (state, action) => {
      state.error = action.payload;
    },

    // =================================================
    // CLEAR TASKS
    // =================================================

    clearTasks: (state) => {
      state.tasks = [];

      state.pagination = {
        ...initialState.pagination,
      };

      state.error = "";
    },
  },

  // =====================================================
  // ASYNC THUNKS
  // =====================================================

  extraReducers: (builder) => {
    builder

      // -------------------------------------------------
      // FETCH PENDING
      // -------------------------------------------------

      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = "";
      })

      // -------------------------------------------------
      // FETCH SUCCESS
      // -------------------------------------------------

      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.error = "";

        state.tasks =
          action.payload.tasks || [];

        state.pagination =
          action.payload.pagination ||
          initialState.pagination;
      })

      // -------------------------------------------------
      // FETCH FAILED
      // -------------------------------------------------

      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;

        state.error =
          action.payload ||
          "Unable to load tasks.";
      });
  },
});

// =====================================================
// ACTIONS
// =====================================================

export const {
  setTasks,
  addTaskToStore,
  updateTaskInStore,
  deleteTaskFromStore,
  setLoading,
  setError,
  clearTasks,
} = taskSlice.actions;

// =====================================================
// SELECTORS
// =====================================================

export const selectTasks = (state) =>
  state.tasks.tasks;

export const selectTasksLoading = (state) =>
  state.tasks.loading;

export const selectTasksError = (state) =>
  state.tasks.error;

export const selectTasksPagination = (state) =>
  state.tasks.pagination;

// =====================================================
// REDUCER
// =====================================================

export default taskSlice.reducer;