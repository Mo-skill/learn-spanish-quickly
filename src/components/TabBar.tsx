import { NavLink } from "react-router-dom";
import { Home, BookOpen, BrainCircuit, RotateCw, Gamepad2, Settings } from "lucide-react";
import { cn } from "../lib/utils";

const tabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/learn", label: "Learn", icon: BookOpen },
  { path: "/quiz", label: "Quiz", icon: BrainCircuit },
  { path: "/review", label: "Review", icon: RotateCw },
  { path: "/games", label: "Games", icon: Gamepad2 },
  { path: "/settings", label: "Settings", icon: Settings }
];

const TabBar = () => (
  <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg pb-safe">
    <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center space-y-1 rounded-lg px-2 py-1 transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              <tab.icon
                size={24}
                strokeWidth={isActive ? 2.5 : 2}
                className={cn("transition-transform", isActive && "scale-110")}
              />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default TabBar;

