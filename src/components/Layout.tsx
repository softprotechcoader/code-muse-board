import { Link, useLocation } from "react-router-dom";
import { Home, ListChecks, History, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Dashboard" },
    { path: "/tracker", icon: ListChecks, label: "Tracker" },
    { path: "/skillup", icon: Target, label: "Skill Up" },
    { path: "/history", icon: History, label: "History" },
    { path: "/ai-chat", icon: Sparkles, label: "AI Chat" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-500">
                <span className="text-xl font-bold text-primary-foreground">T</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                TechTracker
              </h1>
            </div>
            <div className="flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
};

export default Layout;
