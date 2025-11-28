import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings,
  HelpCircle,
  LogOut,
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
import {
  authApi,
  sidebarConversationCreate,
  sidebarConversationDelete,
  sidebarTitleApi,
} from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { useChat } from "@/contexts/ChatContext";
import { MessageSquarePlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Chat {
  conversation: string;
  title: string;
  created_at: Date;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isEdited?: boolean;
}

interface ChatSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onSelectConversation: (conversation: string) => void;
  setMessages: (messages: Message[]) => void;
}

export function ChatSidebar({
  isCollapsed,
  onToggle,
  onSelectConversation,
  setMessages,
}: ChatSidebarProps) {
  const { user, loading, login, logout } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentDialog, setCurrentDialog] = useState<{
    type: "login" | "signup" | "settings" | "help" | "logout" | "forgot" | null;
  }>({ type: null });

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const isMobile = windowWidth < 768;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { setActiveChatId, activeChatId } = useChat();

  // Load chats when user changes OR when refresh event is triggered
  // Load chats when user changes OR when refresh event is triggered
  const handleChatTitle = async () => {
    try {
      const res = await sidebarTitleApi.sidebarConversationGetTitle();
      console.log("📋 Backend chats response:", res.data);

      // Merge with local updates - preserve any titles we've updated locally
      setChats((prev) => {
        const localTitleUpdates = new Map();
        prev.forEach((chat) => {
          // Only preserve titles that are different from "New Chat"
          if (chat.title !== "New Chat" && chat.title !== "") {
            localTitleUpdates.set(chat.conversation, chat.title);
          }
        });

        const mergedChats = res.data.map((backendChat: Chat) => ({
          ...backendChat,
          // Use local title if we have one, otherwise use backend title
          title:
            localTitleUpdates.get(backendChat.conversation) ||
            backendChat.title,
        }));

        console.log("🔄 Merged chats:", mergedChats);
        return mergedChats;
      });
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  };

  // Load chats when user changes
  useEffect(() => {
    if (user) {
      handleChatTitle();
    } else {
      setChats([]);
    }
  }, [user]);

  // Sync active chat with context
  useEffect(() => {
    setActiveChat(activeChatId);
  }, [activeChatId]);

  // Listen for refresh events from other components
  useEffect(() => {
    const handleRefreshSidebar = () => {
      console.log("Refresh sidebar event received");
      if (user) {
        handleChatTitle();
      }
    };

    window.addEventListener("refreshSidebar", handleRefreshSidebar);
    return () => {
      window.removeEventListener("refreshSidebar", handleRefreshSidebar);
    };
  }, [user]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for chat title updates from the chat interface
  useEffect(() => {
    const handleTitleUpdate = (
      event: CustomEvent<{ conversationId: string; title: string }>
    ) => {
      console.log("📝 Received updateChatTitle event:", event.detail);
      const { conversationId, title } = event.detail;
      setChats((prev) =>
        prev.map((chat) =>
          chat.conversation === conversationId ? { ...chat, title } : chat
        )
      );
    };

    const handleEvent = (e: Event) =>
      handleTitleUpdate(
        e as CustomEvent<{ conversationId: string; title: string }>
      );
    window.addEventListener("updateChatTitle", handleEvent as EventListener);

    return () => {
      window.removeEventListener(
        "updateChatTitle",
        handleEvent as EventListener
      );
    };
  }, []);

  // Handle click outside for mobile menu and profile dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

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

  // Debug: Log when chats update
  useEffect(() => {
    console.log("🔄 ChatSidebar chats updated:", chats);
  }, [chats]);

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    setCurrentDialog({ type: null });
    await handleChatTitle(); // Reload chats after login
    toast({
      title: "Login successful",
      description: "Welcome back!",
    });
  };

  const handleSignUp = async (
    username: string,
    email: string,
    password: string
  ) => {
    try {
      await authApi.register({ username, email, password });
      await handleLogin(email, password);
    } catch (error) {
      throw error;
    }
  };

  const handleSaveSettings = async (
  username: string, 
  currentPassword: string, 
  newPassword: string
) => {
  try {
    const payload: { 
      username?: string; 
      password?: string;
      currentPassword?: string;
    } = {};
    
    // Always include username if it changed
    if (username && username !== user?.username) {
      payload.username = username;
    }
    
    // Only include password fields if user is changing password
    if (currentPassword && newPassword && newPassword.trim() !== "") {
      payload.currentPassword = currentPassword;
      payload.password = newPassword;
    }

    // If nothing changed, just close dialog
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
    
    // Better error handling for password verification errors
    if (typeof err === "object" && err !== null) {
      if ("error" in err && typeof err.error === "string") {
        message = err.error;
      } else if ("description" in err && typeof err.description === "string") {
        message = err.description;
      } else if (err instanceof Error) {
        message = err.message;
      }
    }
    
    toast({
      title: "Update failed",
      description: message,
      variant: "destructive",
    });
  }
};

  const handleLogout = async () => {
    try {
      await logout();
      setIsProfileOpen(false);
      setChats([]);
      setActiveChatId(null);
      setActiveChat(null);
      setMessages([]);
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

  // New chat handler
  const handleNewChat = async () => {
    try {
      // Clear current state first
      setActiveChat(null);
      setActiveChatId(null);
      setMessages([]);

      // Create a new conversation in the backend
      const res = await sidebarConversationCreate.newChat();

      // Create chat object with placeholder title
      const newChat: Chat = {
        conversation: res.data.conversation,
        title: "New Chat", // Placeholder that will be updated
        created_at: new Date(res.data.created_at),
      };

      // Add to the beginning of the chat list and refresh
      setChats((prev) => [newChat, ...prev]);

      // Set as active chat
      setActiveChat(newChat.conversation);
      setActiveChatId(newChat.conversation);

      // Close mobile menu if open
      if (isMobile) setIsMobileMenuOpen(false);

      toast({
        title: "New chat created",
        description: "Start a new conversation!",
      });
    } catch (error) {
      console.error("Failed to create new chat:", error);
      toast({
        title: "Failed to start a new chat",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete chat handler
  const handleDeleteChat = async (conversationId: string) => {
    try {
      await sidebarConversationDelete.chatDelete(conversationId);

      // Remove from local state
      setChats((prev) =>
        prev.filter((chat) => chat.conversation !== conversationId)
      );

      // If deleted chat is active, reset
      if (activeChat === conversationId) {
        setActiveChatId(null);
        setActiveChat(null);
        setMessages([]);
      }

      toast({
        title: "Chat deleted",
        description: "The conversation has been removed.",
      });
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast({
        title: "Failed to delete chat",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

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
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "md:-translate-x-full" : "md:translate-x-0",
          "w-64 md:w-64"
        )}
        ref={dropdownRef}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0 h-[69px]">
            <div className="flex items-center gap-2">
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

          {/* Improved New Chat Button */}
          {user && (
            <div className="flex py-3 mb-1 justify-center items-center border-b border-border">
              <button
                onClick={handleNewChat}
                className={cn(
                  "flex justify-center items-center gap-2 py-2.5 px-4 w-full mx-3 rounded-lg text-sm transition-all duration-200",
                  "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow",
                  "font-medium"
                )}
              >
                <MessageSquarePlus className="w-4 h-4" />
                New Chat
              </button>
            </div>
          )}

          {/* Chat List with ScrollArea */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {chats.map((chat) => (
                <div
                  key={chat.conversation}
                  className={cn(
                    "group grid grid-cols-[1fr,auto] items-center gap-2 w-full p-3 rounded-lg mb-1 transition-all duration-200 border",
                    "hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20",
                    activeChat === chat.conversation
                      ? "bg-accent text-accent-foreground border-accent-foreground/30 shadow-sm"
                      : "border-transparent"
                  )}
                >
                  {/* Text content */}
                  <button
                    onClick={() => {
                      setActiveChatId(chat.conversation);
                      setActiveChat(chat.conversation);
                      onSelectConversation(chat.conversation);
                      if (isMobile) setIsMobileMenuOpen(false);
                    }}
                    className="text-left min-w-0 overflow-hidden w-full"
                  >
                    <p className="font-medium text-sm truncate">{chat.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {chat.created_at.toLocaleDateString()}
                    </p>
                  </button>

                  {/* Delete button - hidden until hover but always in same spot */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(chat.conversation);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all duration-200 p-1 rounded hover:bg-destructive/10 flex-shrink-0 w-6 h-6 flex items-center justify-center"
                    title="Delete chat"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Compact User Profile Section */}
          <div className="mt-auto border-t border-border bg-muted/30">
            {loading ? (
              <div className="p-3">
                <div className="animate-pulse">
                  <div className="h-6 bg-muted rounded mb-1"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </div>
              </div>
            ) : !user ? (
              <div className="p-3">
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
              <div className="p-3">
                <div className="relative">
                  <button
                    onClick={toggleProfile}
                    className="w-full flex items-center space-x-2 p-1 rounded-md hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-7 w-7 flex-shrink-0">
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
                      <p className="font-medium text-xs truncate">
                        {user?.username || "Guest"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email || ""}
                      </p>
                    </div>
                    {isProfileOpen ? (
                      <ChevronUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>

                  {isProfileOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover rounded-md shadow-lg border border-border overflow-hidden z-10">
                      <div className="px-3 py-1 text-xs text-muted-foreground border-b border-border">
                        {user?.email || "No email"}
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => openDialog("settings")}
                          className="w-full flex items-center px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                        >
                          <Settings className="mr-2 h-3 w-3" />
                          <span>Settings</span>
                        </button>
                        <button
                          onClick={() => openDialog("help")}
                          className="w-full flex items-center px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                        >
                          <HelpCircle className="mr-2 h-3 w-3" />
                          <span>Help</span>
                        </button>
                        <div className="border-t border-border my-0.5"></div>
                        <button
                          onClick={() => openDialog("logout")}
                          className="w-full flex items-center px-3 py-1.5 text-xs text-red-500 hover:bg-muted/50 transition-colors"
                        >
                          <LogOut className="mr-2 h-3 w-3" />
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
