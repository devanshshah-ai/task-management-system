import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

import "./Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Header />

        <main className="dashboard-content">
          <div className="dashboard-welcome">
            <h2>Task Overview</h2>
            <p>
              Manage and track your tasks from one place.
            </p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span>Total Tasks</span>
              <strong>0</strong>
            </div>

            <div className="stat-card">
              <span>Pending</span>
              <strong>0</strong>
            </div>

            <div className="stat-card">
              <span>In Progress</span>
              <strong>0</strong>
            </div>

            <div className="stat-card">
              <span>Completed</span>
              <strong>0</strong>
            </div>

            <div className="stat-card">
              <span>Overdue</span>
              <strong>0</strong>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;