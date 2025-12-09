import { Outlet } from "react-router-dom";
import TabBar from "./TabBar";

const Layout = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <main className="min-h-screen">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
};

export default Layout;

