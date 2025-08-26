import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings,
  HelpCircle,
  LogOut,
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
  const [chats] = useState<Chat[]>([
    {
      id: "1",
      title: "Getting started with cyberSync",
      timestamp: "Today",
    },
    {
      id: "2",
      title: "React best practices",
      timestamp: "Yesterday",
    },
    {
      id: "3",
      title: "TypeScript configuration",
      timestamp: "2 days ago",
    },
  ]);

  const [activeChat, setActiveChat] = useState("1");
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Toggle this to false for no user

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentDialog, setCurrentDialog] = useState<{
    type: "login" | "signup" | "settings" | "help" | "logout" | null;
    data?: any;
  }>({ type: null });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // User data - in a real app, this would come from a context or state management
  const [userData, setUserData] = useState({
    username: "user123",
    email: "user@example.com",
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleLogout = () => {
    // Add your logout logic here
    console.log("Logging out...");
    setIsLoggedIn(false);
    // Clear any auth state or tokens here
  };

  const handleLogin = (email: string, password: string) => {
    console.log("Logging in with:", { email, password });
    // In a real app, you would make an API call here
    setIsLoggedIn(true);
    setCurrentDialog({ type: null });
  };

  const handleSignUp = (username: string, email: string, password: string) => {
    console.log("Signing up with:", { username, email, password });
    // In a real app, you would make an API call here
    setUserData({ username, email });
    setIsLoggedIn(true);
    setCurrentDialog({ type: null });
  };

  const handleSaveSettings = (username: string, password: string) => {
    console.log("Saving settings:", { username, password });
    // In a real app, you would make an API call here
    setUserData((prev) => ({ ...prev, username }));
    setCurrentDialog({ type: null });
  };

  const openDialog = (
    type: "login" | "signup" | "settings" | "help" | "logout",
    data?: any
  ) => {
    setCurrentDialog({ type, data });
    setIsProfileOpen(false);
  };

  const closeDialog = () => {
    setCurrentDialog({ type: null });
  };

  return (
    <div
      className={cn(
        "bg-chat-sidebar border-r border-border transition-all duration-300 flex flex-col h-screen justify-between",
        isCollapsed ? "w-0 overflow-hidden" : "w-64"
      )}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2
              className={cn("font-semibold text-lg", isCollapsed && "hidden")}
            >
              cyberSync
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="rounded-md p-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={cn(
                  "w-4 h-4 transition-transform",
                  isCollapsed && "rotate-180"
                )}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </Button>
          </div>
        </div>

        <div className={cn("p-4", isCollapsed && "hidden")}>
          <Button className="w-full justify-start mb-4" variant="outline">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 mr-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            New Chat
          </Button>

          <div className="space-y-2">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  "hover:bg-muted/50 group",
                  activeChat === chat.id && "bg-muted"
                )}
              >
                <div className="font-medium text-sm truncate">{chat.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {chat.timestamp}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Auth Section */}
      <div className="p-4 border-t border-border">
        {isLoggedIn ? (
          <div className="relative" ref={dropdownRef}>
            <div
              className={cn(
                "flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                isProfileOpen && "bg-muted/50"
              )}
              onClick={toggleProfile}
            >
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-user.jpg" alt="User" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="text-sm font-medium">user@example.com</div>
              </div>
              {isProfileOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {isProfileOpen && (
              <div className="absolute bottom-full left-0 right-0 mx-4 mb-2 bg-popover rounded-md shadow-lg border border-border overflow-hidden">
                <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
                  user@example.com
                </div>
                <div className="py-1">
                  <button
                    className="w-full flex items-center px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDialog("settings");
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    className="w-full flex items-center px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDialog("help");
                    }}
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Help</span>
                  </button>
                  <div className="border-t border-border my-1"></div>
                  <button
                    className="w-full flex items-center px-4 py-2 text-sm text-destructive hover:bg-muted/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDialog("logout");
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => openDialog("login")}
            >
              Sign In
            </Button>
            <Button
              variant="default"
              className="w-full"
              onClick={() => openDialog("signup")}
            >
              Create Account
            </Button>
          </div>
        )}
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
        onConfirm={handleLogout}
      />
    </div>
  );
}
