import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

import "./DashboardLayout.css";

const DashboardLayout = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Header />

        <main className="dashboard-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;