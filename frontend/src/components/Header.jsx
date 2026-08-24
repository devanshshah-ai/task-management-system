import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "./Header.css";

const THEME_KEY = "theme";

const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_KEY) || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "light" ? "dark" : "light"
    );
  };

  return (
    <header className="header">
      <div className="header-left">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.name}</p>
        </div>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${
            theme === "light" ? "dark" : "light"
          } mode`}
          title={`Switch to ${
            theme === "light" ? "dark" : "light"
          } mode`}
        >
          <span className="theme-toggle-icon">
            {theme === "light" ? "☾" : "☀"}
          </span>
        </button>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;