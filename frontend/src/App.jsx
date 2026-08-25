import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import CreateTask from "./pages/CreateTask";
import Users from "./pages/Users";

import DashboardLayout from "./layouts/DashboardLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =========================
            Public Routes
        ========================= */}

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />


        {/* =========================
            Dashboard Layout
        ========================= */}

        <Route element={<DashboardLayout />}>

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* Tasks */}
          <Route
            path="/tasks"
            element={<Tasks />}
          />

          {/* Create Task */}
          <Route
            path="/tasks/create"
            element={<CreateTask />}
          />

          {/* Users */}
          <Route
            path="/users"
            element={<Users />}
          />

        </Route>


        {/* =========================
            Fallback
        ========================= */}

        <Route
          path="*"
          element={<Login />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;