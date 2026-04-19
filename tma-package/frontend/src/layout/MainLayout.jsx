import { Outlet } from "react-router-dom";
import HeaderV3 from "../components/layout/HeaderV3";
import CategorySidebar from "../components/CategorySidebar";
import "./layout.css";

export default function MainLayout() {
  return (
    <>
      <HeaderV3 />
      <div className="app-layout">
        <aside className="app-sidebar">
          <CategorySidebar />
        </aside>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
