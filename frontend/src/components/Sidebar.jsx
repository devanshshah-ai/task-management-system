import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import "./Sidebar.css";

const Sidebar = () => {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>TaskFlow</h2>
        <span>Management System</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/tasks"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          Tasks
        </NavLink>

        {isAdmin && (
          <NavLink
            to="/users"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Users
          </NavLink>
        )}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-name">
          {user?.name}
        </div>

        <div className="sidebar-user-role">
          {user?.role}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;