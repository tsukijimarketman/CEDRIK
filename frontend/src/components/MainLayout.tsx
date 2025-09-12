import { useState, useEffect } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md hover:bg-gray-100 transition-colors md:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-6 w-6 text-blue-600" />
      </button>

      {/* Desktop Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-64 z-40 p-2 bg-white rounded-r-md shadow-md hover:bg-gray-100 transition-colors hidden md:block"
        aria-label="Toggle sidebar"
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="h-6 w-6 text-blue-600" />
        ) : (
          <ChevronLeft className="h-6 w-6 text-blue-600" />
        )}
      </button>

      <div
        className={`fixed inset-y-0 left-0 z-30 transform ${
          isSidebarCollapsed
            ? "-translate-x-full md:translate-x-0"
            : "translate-x-0"
        } transition-transform duration-300`}
      >
        <ChatSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </div>

      <main
        className={`flex-1 overflow-y-auto transition-all duration-300 ${
          isSidebarCollapsed ? "ml-0" : "md:ml-64"
        }`}
      >
        <div className="p-4 md:p-6 pt-16">
          {isMobile && !isSidebarCollapsed && (
            <div
              className="fixed inset-0 bg-black/50 z-30"
              onClick={toggleSidebar}
            />
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
