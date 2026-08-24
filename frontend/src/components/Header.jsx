import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "./Header.css";

const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="header">
      <div>
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.name}</p>
      </div>

      <button
        className="logout-button"
        onClick={handleLogout}
      >
        Logout
      </button>
    </header>
  );
};

export default Header;