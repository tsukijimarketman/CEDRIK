import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings,
  HelpCircle,
  LogOut,
  LogIn,
  ChevronLeft,
  Menu,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { LoginDialog } from "./dialogs/LoginDialog";
import { SignUpDialog } from "./dialogs/SignUpDialog";
import { SettingsDialog } from "./dialogs/SettingsDialog";
import { HelpDialog } from "./dialogs/HelpDialog";
import { LogoutDialog } from "./dialogs/LogoutDialog";

interface Chat {
  id: string;
  title: string;
  timestamp: string;
}

interface ChatSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function ChatSidebar({ isCollapsed, onToggle }: ChatSidebarProps) {
  // Chat data
  const [chats] = useState<Chat[]>([
    { id: "1", title: "Getting started with cyberSync", timestamp: "Today" },
    { id: "2", title: "React best practices", timestamp: "Yesterday" },
    { id: "3", title: "TypeScript configuration", timestamp: "2 days ago" },
  ]);

  // UI State
  const [activeChat, setActiveChat] = useState("1");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // User data
  const [userData, setUserData] = useState({
    username: "user123",
    email: "user@example.com",
  });

  // Dialog state
  const [currentDialog, setCurrentDialog] = useState<{
    type: "login" | "signup" | "settings" | "help" | "logout" | null;
  }>({ type: null });

  // Responsive state
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const isMobile = windowWidth < 768;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle click outside for mobile menu and profile dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Close mobile menu when clicking outside on mobile
      if (isMobileMenuOpen && isMobile) {
        const sidebar = document.querySelector(".sidebar-container");
        const menuButton = document.querySelector(".mobile-menu-button");

        if (
          sidebar &&
          !sidebar.contains(target) &&
          menuButton &&
          !menuButton.contains(target)
        ) {
          setIsMobileMenuOpen(false);
        }
      }

      // Close profile dropdown when clicking outside
      if (
        isProfileOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen, isMobile, isProfileOpen]);

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  // Auth handlers
  const handleLogin = (email: string, password: string) => {
    console.log("Logging in with:", { email, password });
    setIsLoggedIn(true);
    setCurrentDialog({ type: null });
  };

  const handleSignUp = (username: string, email: string, password: string) => {
    console.log("Signing up with:", { username, email, password });
    setUserData({ username, email });
    setIsLoggedIn(true);
    setCurrentDialog({ type: null });
  };

  const handleSaveSettings = (username: string, password: string) => {
    console.log("Saving settings:", { username, password });
    setUserData((prev) => ({ ...prev, username }));
    setCurrentDialog({ type: null });
  };

  const handleLogout = () => {
    console.log("Logging out...");
    setIsLoggedIn(false);
    setIsProfileOpen(false);
  };

  // Dialog helpers
  const openDialog = (
    type: "login" | "signup" | "settings" | "help" | "logout"
  ) => {
    setCurrentDialog({ type });
    setIsProfileOpen(false);
  };

  const closeDialog = () => {
    setCurrentDialog({ type: null });
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-30 p-2 bg-red rounded-md shadow-md hover:bg-gray-100 transition-colors md:hidden flex items-center space-x-2"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar */}
      <div
        ref={dropdownRef}
        className={cn(
          "bg-chat-sidebar border-r border-border transition-all duration-300 flex flex-col fixed md:relative z-20 sidebar-container",
          "transform transition-transform duration-300 ease-in-out",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
          isCollapsed ? "w-0 overflow-hidden" : "w-64"
        )}
        style={{
          width: isCollapsed ? "0" : "16rem",
          minWidth: isCollapsed ? "0" : "16rem",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
            <h1 className="font-bold text-lg">cyberSync</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="hidden md:flex h-8 w-8"
              aria-label="Toggle sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Chat List */}
            <div className="p-2">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors mb-1",
                    "hover:bg-muted/50",
                    activeChat === chat.id ? "bg-muted" : ""
                  )}
                >
                  <p className="font-medium text-sm">{chat.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {chat.timestamp}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* User Profile & Auth Section - Fixed at bottom */}
          <div className="mt-auto border-t border-border bg-muted/30">
            {!isLoggedIn ? (
              <div className="p-4">
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center gap-2"
                    onClick={() => openDialog("login")}
                  >
                    <span>Login</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() => openDialog("signup")}
                  >
                    Sign Up
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="relative">
                  <button
                    onClick={toggleProfile}
                    className="w-full flex items-center space-x-2 p-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`}
                        alt={userData.username}
                      />
                      <AvatarFallback>
                        {userData.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {userData.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {userData.email}
                      </p>
                    </div>
                    {isProfileOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover rounded-md shadow-lg border border-border overflow-hidden z-10">
                      <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
                        {userData.email}
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => openDialog("settings")}
                          className="w-full flex items-center px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </button>
                        <button
                          onClick={() => openDialog("help")}
                          className="w-full flex items-center px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                        >
                          <HelpCircle className="mr-2 h-4 w-4" />
                          <span>Help</span>
                        </button>
                        <div className="border-t border-border my-1"></div>
                        <button
                          onClick={() => openDialog("logout")}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-500 hover:bg-muted/50 transition-colors"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Log out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Components */}
      <LoginDialog
        open={currentDialog.type === "login"}
        onClose={closeDialog}
        onLogin={handleLogin}
        onSwitchToSignUp={() => openDialog("signup")}
      />

      <SignUpDialog
        open={currentDialog.type === "signup"}
        onClose={closeDialog}
        onSignUp={handleSignUp}
        onSwitchToLogin={() => openDialog("login")}
      />

      <SettingsDialog
        open={currentDialog.type === "settings"}
        onClose={closeDialog}
        onSave={handleSaveSettings}
        currentUsername={userData.username}
        currentEmail={userData.email}
      />

      <HelpDialog open={currentDialog.type === "help"} onClose={closeDialog} />

      <LogoutDialog
        open={currentDialog.type === "logout"}
        onClose={closeDialog}
        onConfirm={() => {
          handleLogout();
          closeDialog();
        }}
      />

      {/* Mobile Overlay */}
      {isMobileMenuOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
