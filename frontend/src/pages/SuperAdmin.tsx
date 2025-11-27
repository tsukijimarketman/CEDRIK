import { useState } from "react";
import { SuperAdminSidebar } from "@/components/SuperAdminSidebar";
import { UserManagement } from "@/components/UserManagement";
import { AuditLogs } from "@/components/AuditLogs";
import { KnowledgeBase } from "@/components/KnowledgeBase";
import { MemoryArchive } from "@/components/MemoryArchive";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun } from "lucide-react";

type ActiveSection = "user-management" | "audit-logs" | "knowledge-base" | "archive";

const SuperAdmin = () => {
  const [activeSection, setActiveSection] = useState<ActiveSection>("user-management");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();

  const renderContent = () => {
    switch (activeSection) {
      case "user-management":
        return <UserManagement />;
      case "audit-logs":
        return <AuditLogs />;
      case "knowledge-base":
        return <KnowledgeBase />;
      case "archive":
        return <MemoryArchive />;
      default:
        return <UserManagement />;
    }
  };

  const contentMarginClass = "md:ml-64";

  return (
    <div className="relative h-screen bg-background">
      <SuperAdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div
        className={`flex flex-col h-full ${contentMarginClass} transition-all duration-300 min-w-0`}
      >
        {/* Header */}
        <div className="border-b border-border bg-background">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              {isSidebarCollapsed && (
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="mr-4 p-2 hover:bg-muted rounded-md transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="gap-2"
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {theme === "light" ? "Dark" : "Light"}
                </span>
              </Button>
              <span className="text-sm text-muted-foreground capitalize">
                {activeSection.replace("-", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default SuperAdmin;