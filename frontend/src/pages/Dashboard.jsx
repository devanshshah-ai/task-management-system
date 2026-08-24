import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { getTaskStats, getTasks } from "../api/taskApi";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

import "./Dashboard.css";

const initialStats = {
  totalTasks: 0,
  pendingTasks: 0,
  inProgressTasks: 0,
  completedTasks: 0,
  overdueTasks: 0,
};

const Dashboard = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState(initialStats);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

    useEffect(() => {
        let ignore = false;

        const loadDashboard = async () => {
            try {
            setLoading(true);
            setError("");

            const [statsResponse, tasksResponse] = await Promise.all([
                getTaskStats(),
                getTasks({
                page: 1,
                limit: 5,
                sortBy: "dueDate",
                sortOrder: "asc",
                }),
            ]);

            if (!ignore) {
                setStats(statsResponse.data);
                setUpcomingTasks(tasksResponse.data.tasks || []);
            }
            } catch (error) {
            console.error("Dashboard error:", error);

            if (!ignore) {
                setError(
                error?.response?.data?.message ||
                    error?.message ||
                    "Unable to load dashboard data."
                );
            }
            } finally {
            if (!ignore) {
                setLoading(false);
            }
            }
        };

        loadDashboard();

        return () => {
            ignore = true;
        };
    }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 18) {
      return "Good afternoon";
    }

    return "Good evening";
  };

  const statCards = [
    {
      label: "Total Tasks",
      value: stats.totalTasks,
      className: "",
      icon: "✓",
    },
    {
      label: "Pending",
      value: stats.pendingTasks,
      className: "pending",
      icon: "◷",
    },
    {
      label: "In Progress",
      value: stats.inProgressTasks,
      className: "progress",
      icon: "→",
    },
    {
      label: "Completed",
      value: stats.completedTasks,
      className: "completed",
      icon: "✓",
    },
    {
      label: "Overdue",
      value: stats.overdueTasks,
      className: "overdue",
      icon: "!",
    },
  ];

  return (
        <main className="dashboard-page">
          {/* Welcome */}
          <section className="dashboard-welcome-header">
            <div className="dashboard-welcome-text">
              <span className="dashboard-eyebrow">
                {getGreeting()}
              </span>

              <h1>
                Welcome back, {user?.name}
              </h1>

              <p>
                Here's what's happening with your tasks today.
              </p>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="error-message dashboard-error">
              {error}
            </div>
          )}

          {/* Statistics */}
          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <h2>Overview</h2>

              <p>
                Your current task progress at a glance.
              </p>
            </div>

            <div className="dashboard-stats-grid">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className={`dashboard-stat-card ${card.className}`}
                >
                  <div className="dashboard-stat-card-top">
                    <span className="dashboard-stat-label">
                      {card.label}
                    </span>

                    <span className="dashboard-stat-icon">
                      {card.icon}
                    </span>
                  </div>

                  <strong className="dashboard-stat-value">
                    {loading ? "—" : card.value}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          {/* Tasks */}
        <section className="dashboard-section">
        <div className="dashboard-section-heading">
            <h2>Upcoming Tasks</h2>

            <p>
            Tasks with the nearest deadlines.
            </p>
        </div>

        <div className="dashboard-empty-state">
            {loading ? (
            <div className="dashboard-loading">
                Loading upcoming tasks...
            </div>
            ) : upcomingTasks.length === 0 ? (
            <>
                <div className="dashboard-empty-icon">
                ✓
                </div>

                <h3>No upcoming tasks</h3>

                <p>
                You don't have any tasks with upcoming deadlines.
                </p>
            </>
            ) : (
            <div className="dashboard-task-list">
                {upcomingTasks.map((task) => (
                <div
                    key={task._id}
                    className="dashboard-task-item"
                >
                    <div className="dashboard-task-info">
                    <h3 title={task.title}>
                        {task.title}
                    </h3>
                    </div>

                    <div className="dashboard-task-details">
                    <span>
                        {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString(
                            "en-IN",
                            {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            }
                            )
                        : "No deadline"}
                    </span>

                    <span
                        className={`dashboard-task-status dashboard-task-status-${task.status}`}
                    >
                        {task.status?.replace("_", " ")}
                    </span>
                    </div>
                </div>
                ))}
            </div>
            )}
        </div>
        </section>
        </main>
  );
};

export default Dashboard;