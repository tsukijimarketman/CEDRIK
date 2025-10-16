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
import { ForgotPasswordDialog } from "./dialogs/ForgotPassword";
import { SignUpDialog } from "./dialogs/SignUpDialog";
import { SettingsDialog } from "./dialogs/SettingsDialog";
import { HelpDialog } from "./dialogs/HelpDialog";
import { LogoutDialog } from "./dialogs/LogoutDialog";
import { authApi, sidebarTitleApi } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";

interface Chat {
  conversation: string;
  title: string;
  created_at: Date;
}

interface ChatSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onSelectConversation:(conversation: string) => void;
}

export function ChatSidebar({ isCollapsed, onToggle, onSelectConversation }: ChatSidebarProps) {
  const { user, loading, login, logout } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  // Chat data

  const handleChatTitle = async () => {
    const res = await sidebarTitleApi.sidebarConversationGetTitle();
    setChats(res.data);
    console.log(res.data);
  };

  useEffect(() => {
    handleChatTitle();
  }, []);

  // mockData; put this instead of res for checking
  // { id: "1", title: "Getting started with CEDRIK", timestamp: "Today" },
  // { id: "2", title: "React best practices", timestamp: "Yesterday" },
  // { id: "3", title: "TypeScript configuration", timestamp: "2 days ago" },

  // UI State
  const [activeChat, setActiveChat] = useState("1");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Dialog state
  const [currentDialog, setCurrentDialog] = useState<{
    type: "login" | "signup" | "settings" | "help" | "logout" | "forgot" | null;
  }>({ type: null });

  // Responsive state
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const isMobile = windowWidth < 768;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    setCurrentDialog({ type: null });
    toast({
      title: "Login successful",
      description: "Welcome back!",
    });
    // do not try ... catch here
    // catch inside handleSubmit of Signup
  };

  const handleSignUp = async (
    username: string,
    email: string,
    password: string
  ) => {
    await authApi.register({ username, email, password });
    setCurrentDialog({ type: null });
    toast({
      title: "Account created",
      description: "Please log in with your new account.",
    });
    // do not try ... catch here
    // catch inside handleSubmit of Signup
  };

  const handleSaveSettings = async (username: string, password: string) => {
    try {
      const payload: { username?: string; password?: string } = {};
      if (username && username !== user?.username) payload.username = username;
      if (password && password.trim() !== "") payload.password = password;

      if (Object.keys(payload).length === 0) {
        setCurrentDialog({ type: null });
        return;
      }

      await authApi.updateMe(payload);
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
      setCurrentDialog({ type: null });
    } catch (err: unknown) {
      let message = "Failed to update settings";
      if (typeof err === "object" && err !== null && "error" in err) {
        const e = err as { error?: unknown };
        if (typeof e.error === "string") message = e.error;
      } else if (err instanceof Error) {
        message = err.message;
      }
      toast({
        title: "Update failed",
        description: String(message),
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsProfileOpen(false);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
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
      {/* Mobile Menu Button (only visible when menu is closed) */}
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="mobile-menu-button fixed top-4 left-4 z-40 p-2 bg-background rounded-md shadow-md hover:bg-accent transition-colors md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "sidebar-container fixed inset-y-0 left-0 z-30 flex h-full flex-col border-r bg-background transition-transform duration-300",
          // Mobile: slide in/out using its own state
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop/Tablet: show or hide entirely based on collapsed state
          isCollapsed ? "md:-translate-x-full" : "md:translate-x-0",
          // Fixed width when visible on md+
          "w-64 md:w-64"
        )}
        ref={dropdownRef}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0 h-[69px]">
            <div className="flex items-center gap-2">
              {/* Mobile close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden h-8 w-8"
                aria-label="Close menu"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <img src="/cedrik.png" alt="CEDRIK" className="w-auto h-6 " />
            </div>
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
                  key={chat.conversation}
                  onClick={() => {
                    setActiveChat(chat.conversation);
                    onSelectConversation(chat.conversation)
                    if (isMobile) setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors mb-1 text-foreground",
                    "hover:bg-accent hover:text-accent-foreground",
                    activeChat === chat.conversation
                      ? "bg-accent text-accent-foreground"
                      : ""
                  )}
                >
                  <p className="font-medium text-sm">{chat.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {chat.created_at.toDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* User Profile & Auth Section - Fixed at bottom */}
          <div className="mt-auto border-t border-border bg-muted/30 h-[117px]">
            {loading ? (
              <div className="p-4">
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded mb-2"></div>
                  <div className="h-6 bg-muted rounded"></div>
                </div>
              </div>
            ) : !user ? (
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
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                          user?.username || "guest"
                        }`}
                        alt={user?.username || "Guest"}
                      />
                      <AvatarFallback>
                        {(user?.username || "G").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user?.username || "Guest"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email || ""}
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
                        {user?.email || "No email"}
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
        onLogin={handleLogin}
        open={currentDialog.type === "login"}
        onClose={() => setCurrentDialog({ type: null })}
        onSwitchToSignUp={() => setCurrentDialog({ type: "signup" })}
        onSwitchToForgot={() => setCurrentDialog({ type: "forgot" })}
      />

      <ForgotPasswordDialog
        open={currentDialog.type === "forgot"}
        onClose={closeDialog}
        onSwitchToSignIn={() => openDialog("login")}
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
        currentUsername={user?.username || ""}
        currentEmail={user?.email || ""}
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
