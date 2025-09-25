import { useState } from "react";
import { SuperAdminSidebar } from "@/components/SuperAdminSidebar";
import { UserManagement } from "@/components/UserManagement";
import { AuditLogs } from "@/components/AuditLogs";
import { KnowledgeBase } from "@/components/KnowledgeBase";

type ActiveSection = "user-management" | "audit-logs" | "knowledge-base";

const SuperAdmin = () => {
  const [activeSection, setActiveSection] = useState<ActiveSection>("user-management");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const renderContent = () => {
    switch (activeSection) {
      case "user-management":
        return <UserManagement />;
      case "audit-logs":
        return <AuditLogs />;
      case "knowledge-base":
        return <KnowledgeBase />;
      default:
        return <UserManagement />;
    }
  };

  // Compute responsive left margin for the fixed sidebar on desktop sizes
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
