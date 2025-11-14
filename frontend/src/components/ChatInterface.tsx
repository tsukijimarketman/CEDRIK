import { useState, useEffect, useRef } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMessage } from "./ChatMessage";
import { WelcomeMessage } from "./WelcomeMessage";
import { ChatInput } from "./ChatInput";
import { ThemeToggle } from "./ThemeToggle";
import { aiApi, sidebarConversationOpen } from "@/api/api";
import { useUser } from "@/contexts/UserContext";
import { useChat } from "@/contexts/ChatContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentSwitcher } from "./AgentSwitcher";
import { useAgent } from "@/contexts/AgentContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isEdited?: boolean;
}

// Extract a human-readable error message from various error shapes
function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as { error?: unknown; msg?: unknown; message?: unknown };
    if (typeof e.error === "string") return e.error;
    if (typeof e.msg === "string") return e.msg;
    if (typeof e.message === "string") return e.message;
  }
  return "An error occurred while getting a response.";
}

// Utility function for copying to clipboard
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

export function ChatInterface() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading } = useUser();
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<
    string | null
  >(null);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [currentChatTitle, setCurrentChatTitle] = useState<string>("");
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { currentAgent } = useAgent();

  const { activeChatId, setActiveChatId } = useChat();

  // Debug authentication state
  useEffect(() => {
    console.log("🔐 ChatInterface Auth Debug:", {
      user: user ? { email: user.email, username: user.username } : null,
      loading,
      isAuthenticated: !!user,
      activeChatId,
    });
  }, [user, loading, activeChatId]);

  // Reset chat title when no active chat
  useEffect(() => {
    if (!activeChatId) {
      setCurrentChatTitle("");
    }
  }, [activeChatId]);

  // Auto scroll to bottom when new messages are added
  useEffect(() => {
    if (messages.length > 0 && viewportRef.current) {
      const viewport = viewportRef.current;
      // Only auto-scroll if user is near the bottom
      const isNearBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
        100;

      if (isNearBottom) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages]);

  // Handle scroll events to show/hide scroll-to-bottom button
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const isAtBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
        100;
      setShowScrollToBottom(!isAtBottom);
    };

    viewport.addEventListener("scroll", handleScroll);

    // Initial check
    handleScroll();

    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  // Also check for scroll position when messages change
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const isAtBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
    setShowScrollToBottom(!isAtBottom);
  }, [messages]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Helper function to determine if a message is new (should show typewriter effect)
  const isNewMessage = (messageId: string, index: number): boolean => {
    // Only assistant messages can be new
    const message = messages[index];
    if (message.role !== "assistant") return false;

    // Check if this message ID is in our new messages set
    return newMessageIds.has(messageId);
  };

  // Add a message to the new messages set (for typewriter effect)
  const markMessageAsNew = (messageId: string) => {
    setNewMessageIds((prev) => new Set(prev).add(messageId));
  };

  // Remove a message from the new messages set (when typing completes)
  const markMessageAsNotNew = (messageId: string) => {
    setNewMessageIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });
  };

  // Clear all new message flags when loading existing conversation
  const clearNewMessageFlags = () => {
    setNewMessageIds(new Set());
  };

  // Handle message editing
  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!user) return;

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: newContent, isEdited: true }
          : msg
      )
    );

    const editedMessage = messages.find((msg) => msg.id === messageId);
    if (editedMessage?.role === "user") {
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      const nextAssistantMessage = messages[messageIndex + 1];

      if (nextAssistantMessage && nextAssistantMessage.role === "assistant") {
        const messagesUntilEdit = messages.slice(0, messageIndex + 1);
        setMessages(messagesUntilEdit);
        handleRegenerateResponse(messageId, newContent);
      }
    }
  };

  // Handle response regeneration
  const handleRegenerateResponse = async (
    userMessageId?: string,
    newContent?: string
  ) => {
    if (!user) return;

    let userMessage: Message;

    if (userMessageId && newContent) {
      userMessage = {
        id: userMessageId,
        role: "user" as const,
        content: newContent,
        timestamp: new Date().toLocaleTimeString(),
      };
    } else {
      const lastUserMessage = [...messages]
        .reverse()
        .find((msg) => msg.role === "user");
      if (!lastUserMessage) return;

      userMessage = lastUserMessage;
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== messages[messages.length - 1].id)
      );
    }

    setRegeneratingMessageId(userMessage.id);
    setIsLoading(true);

    const thinkingId = `thinking-${Date.now()}`;
    const thinkingMessage: Message = {
      id: thinkingId,
      role: "assistant",
      content: "CEDRIK is thinking...",
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, thinkingMessage]);
    // Mark the thinking message as new for immediate display
    markMessageAsNew(thinkingId);

    try {
      const res = await aiApi.chat({
        conversation: activeChatId,
        content: userMessage.content,
        file: null,
        agent: currentAgent, 
      });

      const reply = res.data.reply ?? "";
      const returnedConvId = res.data.conversation;

      if (returnedConvId && !activeChatId) {
        setActiveChatId(returnedConvId);
      }

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("refreshSidebar"));
      }, 100);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                content: reply,
                timestamp: new Date().toLocaleTimeString(),
              }
            : m
        )
      );

      // Mark the final message as new for typewriter effect
      markMessageAsNew(thinkingId);
    } catch (err) {
      const message = getErrorMessage(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                content: `Error: ${message}`,
                timestamp: new Date().toLocaleTimeString(),
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setRegeneratingMessageId(null);
    }
  };

  const handleSendMessage = (content: string) => {
    if (!user) {
      console.log("Please log in to send messages");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const thinkingId = `thinking-${Date.now()}`;
    const thinkingMessage: Message = {
      id: thinkingId,
      role: "assistant",
      content: "CEDRIK is thinking...",
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, thinkingMessage]);
    markMessageAsNew(thinkingId);

    setIsLoading(true);

    void aiApi
      .chat({
        conversation: activeChatId,
        content: content,
        file: null,
        agent: currentAgent,
      })
      .then((res) => {
        const reply = res.data.reply ?? "";
        const returnedConvId = res.data.conversation;

        if (returnedConvId && !activeChatId) {
          setActiveChatId(returnedConvId);
          // Generate a title from the first message
          const generatedTitle =
            content.slice(0, 30) + (content.length > 30 ? "..." : "");
          setCurrentChatTitle(generatedTitle);

          // Trigger sidebar refresh to update the title in the chat list
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("refreshSidebar"));
          }, 100);
        } else {
          // Just refresh sidebar for existing chats
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("refreshSidebar"));
          }, 100);
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  content: reply,
                  timestamp: new Date().toLocaleTimeString(),
                }
              : m
          )
        );

        markMessageAsNew(thinkingId);
      })
      .catch((err) => {
        const message = getErrorMessage(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  content: `Error: ${message}`,
                  timestamp: new Date().toLocaleTimeString(),
                }
              : m
          )
        );
      })
      .finally(() => setIsLoading(false));
  };

  const handleOpenMessage = async (conversation: string) => {
    if (!user) return;

    try {
      // Clear any existing new message flags when loading a conversation
      clearNewMessageFlags();

      const res = await sidebarConversationOpen.conversationOpen(conversation);
      const fetchedMessages = res.data.map(
        (msg, index) =>
          ({
            id: index.toString(),
            role: index % 2 === 0 ? "user" : "assistant",
            content: msg.text,
            timestamp: msg.created_at.toLocaleString(),
          } as Message)
      );
      setMessages(fetchedMessages);

      // Set the chat title (you might need to fetch this from your API)
      // For now, we'll generate a title from the first message
      if (fetchedMessages.length > 0) {
        const firstMessage = fetchedMessages[0].content;
        const generatedTitle =
          firstMessage.slice(0, 30) + (firstMessage.length > 30 ? "..." : "");
        setCurrentChatTitle(generatedTitle);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const contentMarginClass = isSidebarCollapsed ? "md:ml-0" : "md:ml-64";
  const isAuthenticated = !!user;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderHeader = () => (
  <div
    className={`fixed top-0 left-0 right-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30 ${contentMarginClass} transition-all duration-300`}
  >
    <div
      className={cn(
        "flex items-center justify-between p-4",
        isSidebarCollapsed ? "max-w-4xl mx-auto" : "w-full px-6"
      )}
    >
      {/* Left section - Hamburger and Logo */}
      <div className="flex items-center gap-4">
        {isSidebarCollapsed ? (
          <>
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="Open sidebar"
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
            <img src="/cedriklogo.png" alt="CEDRIK" className="h-8 w-auto" />
          </>
        ) : (
          <img src="/cedriklogo.png" alt="CEDRIK" className="h-8 w-auto" />
        )}
      </div>

      {/* Centered Chat Title */}
      <div className="flex-1 flex justify-center">
        <h1 className="text-lg font-semibold text-foreground truncate max-w-md">
          {currentChatTitle || "New Chat"}
        </h1>
      </div>

      {/* Right section - Agent Switcher + Theme toggle */}
      <div className="flex items-center gap-2">
        <AgentSwitcher />  {/* ← NEW! */}
        <ThemeToggle />
      </div>
    </div>
  </div>
);

  const renderMessages = () => (
    <ScrollArea className="flex-1" ref={scrollAreaRef}>
      <div ref={viewportRef} className="h-full">
        {messages.length === 0 ? (
          <WelcomeMessage loggedOut={!isAuthenticated} />
        ) : (
          // Add top padding for fixed header and bottom padding for fixed input
          <div className="pt-16 pb-32">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                messageId={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                isEdited={message.isEdited}
                isNewMessage={isNewMessage(message.id, index)}
                onEditMessage={isAuthenticated ? handleEditMessage : undefined}
                onRegenerate={
                  isAuthenticated ? () => handleRegenerateResponse() : undefined
                }
                copyToClipboard={copyToClipboard}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <div className="relative h-screen bg-chat-background flex flex-col">
      {/* Sidebar with higher z-index */}
      <div className="z-40">
        <ChatSidebar
          setMessages={setMessages}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onSelectConversation={handleOpenMessage}
        />
      </div>

      {/* Fixed Header */}
      {renderHeader()}

      {/* Main content area that moves with sidebar */}
      <div
        className={`flex flex-col flex-1 ${contentMarginClass} transition-all duration-300 min-w-0 relative z-20 pt-16`}
      >
        {/* Messages area should take available space */}
        <div className="flex-1 overflow-hidden relative">
          {renderMessages()}

          {/* Scroll to bottom button - Fixed positioning */}
          {showScrollToBottom && (
            <Button
              onClick={scrollToBottom}
              size="sm"
              className="fixed bottom-32 right-8 z-50 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-200 w-10 h-10 flex items-center justify-center"
              title="Scroll to bottom"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Fixed ChatInput */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 ${contentMarginClass} transition-all duration-300`}
      >
        <ChatInput
          onSendMessage={
            isAuthenticated
              ? handleSendMessage
              : () => {
                  console.log("🚫 ChatInput blocked - user not authenticated");
                }
          }
          disabled={!isAuthenticated || isLoading}
        />
      </div>
    </div>
  );
}
