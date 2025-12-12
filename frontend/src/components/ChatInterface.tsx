import { useState, useEffect, useRef } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMessage } from "./ChatMessage";
import { WelcomeMessage } from "./WelcomeMessage";
import { ChatInput } from "./ChatInput";
import { ThemeToggle } from "./ThemeToggle";
import { aiApi, sidebarConversationOpen, sidebarTitleApi } from "@/api/api";
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

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
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



const updateChatTitle = async (
  conversationId: string,
  title: string
): Promise<void> => {
  try {
    console.log("🔄 Updating chat title via API:", { conversationId, title });
    await sidebarTitleApi.updateChatTitle(conversationId, title);
    window.dispatchEvent(
      new CustomEvent("updateChatTitle", {
        detail: { conversationId, title },
      })
    );
    console.log("✅ Title updated successfully");
  } catch (error) {
    console.error("❌ Failed to update chat title via API:", error);
    window.dispatchEvent(
      new CustomEvent("updateChatTitle", {
        detail: { conversationId, title },
      })
    );
    return;
  }

  setTimeout(() => {
    window.dispatchEvent(new CustomEvent("refreshSidebar"));
  }, 500);
};

export function ChatInterface() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const { user, loading } = useUser();
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [currentChatTitle, setCurrentChatTitle] = useState<string>("");
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { currentAgent } = useAgent();
  const [activeTypingMessageId, setActiveTypingMessageId] = useState<string | null>(null);
  const { activeChatId, setActiveChatId } = useChat();
  const [stoppingMessageId, setStoppingMessageId] = useState<string | null>(null);
  const [stoppedMessageIds, setStoppedMessageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log("🔐 ChatInterface Auth Debug:", {
      user: user ? { email: user.email, username: user.username } : null,
      loading,
      isAuthenticated: !!user,
      activeChatId,
    });
  }, [user, loading, activeChatId]);

  useEffect(() => {
    if (!activeChatId) {
      setCurrentChatTitle("");
    }
  }, [activeChatId]);

  useEffect(() => {
    if (messages.length > 0 && viewportRef.current) {
      const viewport = viewportRef.current;
      const isNearBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;

      if (isNearBottom) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const isAtBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
      setShowScrollToBottom(!isAtBottom);
    };

    viewport.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const isAtBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
    setShowScrollToBottom(!isAtBottom);
  }, [messages]);

  useEffect(() => {
  console.log("📊 STATE UPDATE:", {
    isStreaming,
    isLoading,
    hasAbortController: !!abortController,
    activeTypingMessageId,
    shouldShowStopButton: isStreaming && !!abortController
  });
}, [isStreaming, isLoading, abortController, activeTypingMessageId]);

  const scrollToBottom = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const isMessageStopped = (messageId: string): boolean => {
  return stoppedMessageIds.has(messageId);
};

  const isNewMessage = (messageId: string, index: number): boolean => {
    const message = messages[index];
    if (message.role !== "assistant") return false;
    return newMessageIds.has(messageId);
  };

  const markMessageAsNew = (messageId: string) => {
    setNewMessageIds((prev) => new Set(prev).add(messageId));
  };

  const markMessageAsNotNew = (messageId: string) => {
    setNewMessageIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });
  };

  const clearNewMessageFlags = () => {
    setNewMessageIds(new Set());
  };

  // ✅ Callback function for when typewriter completes
  const handleTypewriterComplete = (messageId: string) => {
  console.log("🎬 Typewriter complete for message:", messageId);
  console.log("🎬 Active typing message:", activeTypingMessageId);
  if (messageId === activeTypingMessageId) {
    console.log("✅ Clearing states - this is the active message");
    setIsStreaming(false);
    setIsLoading(false);
    setAbortController(null);
    setActiveTypingMessageId(null);
  } else {
    console.log("⏭️ Ignoring - not the active message");
  }
};

  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!user) return;

    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    const editedMessage = messages[messageIndex];

    if (editedMessage?.role === "user") {
      const nextAssistantMessage = messages[messageIndex + 1];
      let updatedMessages: Message[];

      if (nextAssistantMessage && nextAssistantMessage.role === "assistant") {
        updatedMessages = [
          ...messages.slice(0, messageIndex),
          {
            ...editedMessage,
            content: newContent,
            isEdited: true,
            timestamp: new Date().toLocaleTimeString(),
          },
        ];
      } else {
        updatedMessages = messages.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: newContent, isEdited: true }
            : msg
        );
      }

      setMessages(updatedMessages);

      if (nextAssistantMessage && nextAssistantMessage.role === "assistant") {
        handleRegenerateResponse(messageId, newContent);
      }
    }
  };

  const handleRegenerateResponse = async (
    userMessageId?: string,
    newContent?: string
  ) => {
    if (!user) return;

    const controller = new AbortController();
    setAbortController(controller);

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
    setIsStreaming(true);

    const thinkingId = `thinking-${Date.now()}`;
    const assistantMessage: Message = {
      id: thinkingId,
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    markMessageAsNew(thinkingId);
    setActiveTypingMessageId(thinkingId);

    try {
      let streamedContent = "";

      await aiApi.chatStream(
        {
          conversation: activeChatId,
          content: userMessage.content,
          file: null,
          agent: currentAgent,
        },
        (chunk) => {
          streamedContent += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === thinkingId ? { ...m, content: streamedContent } : m
            )
          );
        },
        controller.signal
      );

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("refreshSidebar"));
      }, 100);

      markMessageAsNew(thinkingId);
      
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  content: m.content || "Response generation stopped.",
                  timestamp: new Date().toLocaleTimeString(),
                }
              : m
          )
        );
      } else {
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
      }
      setIsStreaming(false);
      setIsLoading(false);
      setAbortController(null);
      setActiveTypingMessageId(null);
    } finally {
      // ✅ Don't clear isLoading here - let typewriter complete first
      setRegeneratingMessageId(null);
      
    }
  };

  const handleStopGeneration = () => {
  if (abortController && activeTypingMessageId) {
    console.log("🛑 Stopping generation for message:", activeTypingMessageId);
    
    
    setStoppingMessageId(activeTypingMessageId);
    
    
    abortController.abort();
    
  }
};

const handleMessageStopped = async (messageId: string, displayedContent: string) => {
  console.log("✂️ Message stopped at", displayedContent.length, "chars");
  console.log("📝 Displayed content:", displayedContent);
  
  // Update the message in state immediately
  setMessages((prev) =>
    prev.map((m) =>
      m.id === messageId ? { ...m, content: displayedContent } : m
    )
  );
  
  // Update in backend (only if it's a real message ID, not a thinking ID)
  if (!messageId.startsWith("thinking-")) {
    try {
      console.log("💾 Truncating message in backend...");
      await aiApi.truncateMessage(messageId, displayedContent);
      console.log("✅ Message truncated in backend");
    } catch (err) {
      console.error("❌ Failed to truncate message in backend:", err);
    }
  } else {
    console.log("⚠️ Cannot truncate thinking- message, it hasn't been saved to DB yet");
  }
  
  // ✅ Now clear all the states
  setStoppingMessageId(null);
  setActiveTypingMessageId(null);
  setAbortController(null);
  setIsLoading(false);
  setIsStreaming(false);
};

  

  const handleSendMessage = async (content: string) => {
  if (!user) {
    console.log("Please log in to send messages");
    return;
  }

  const controller = new AbortController();
  setAbortController(controller);

  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: content,
    timestamp: new Date().toLocaleTimeString(),
  };

  setMessages((prev) => [...prev, userMessage]);

  const thinkingId = `thinking-${Date.now()}`;
  const assistantMessage: Message = {
    id: thinkingId,
    role: "assistant",
    content: "",
    timestamp: new Date().toLocaleTimeString(),
  };

  setMessages((prev) => [...prev, assistantMessage]);
  markMessageAsNew(thinkingId);
  setActiveTypingMessageId(thinkingId);
  
  console.log("🚀 Setting isLoading and isStreaming to TRUE");
  setIsLoading(true);
  setIsStreaming(true);

  try {
    let streamedContent = "";

    const result = await aiApi.chatStream(
      {
        conversation: activeChatId,
        content: content,
        file: null,
        agent: currentAgent,
      },
      (chunk) => {
        streamedContent += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId ? { ...m, content: streamedContent } : m
          )
        );
      },
      controller.signal
    );

    console.log("✅ STREAMING DONE");
    console.log("📊 Received:", { 
      conversation: result.conversation, 
      ai_message_id: result.ai_message_id 
    });

    const returnedConvId = result.conversation;
    const aiMessageId = result.ai_message_id;
    
    // ✅ Replace the thinking ID with the real message ID
    if (aiMessageId) {
      console.log(`🔄 Replacing thinking ID ${thinkingId} with real ID ${aiMessageId}`);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId ? { ...m, id: aiMessageId } : m
        )
      );
      
      // ✅ IMPORTANT: Update the active typing message ID to the real ID
      setActiveTypingMessageId(aiMessageId);
      
      // Update new message IDs
      setNewMessageIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(thinkingId);
        newSet.add(aiMessageId);
        return newSet;
      });
    }

    const generatedTitle =
      content.slice(0, 50) + (content.length > 50 ? "..." : "");

    if (returnedConvId && !activeChatId) {
      setActiveChatId(returnedConvId);
      setCurrentChatTitle(generatedTitle);
      await updateChatTitle(returnedConvId, generatedTitle);
    } else if (activeChatId) {
      const nonThinkingMessages = messages.filter(
        (msg) => !msg.id.startsWith("thinking-")
      );
      const isFirstRealMessage = nonThinkingMessages.length === 0;

      if (isFirstRealMessage) {
        setCurrentChatTitle(generatedTitle);
        await updateChatTitle(activeChatId, generatedTitle);
      }
    }

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("refreshSidebar"));
    }, 300);

  } catch (err: any) {
    console.log("❌ ERROR in handleSendMessage");
    if (err.name === "AbortError") {
      // Don't clear content - keep what we have
      console.log("⏸️ Stream aborted - keeping current content");
    } else {
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
    }
    setIsStreaming(false);
    setIsLoading(false);
    setAbortController(null);
    setActiveTypingMessageId(null);
  } finally {
    console.log("🏁 FINALLY block");
  }
};

  const handleOpenMessage = async (conversation: string) => {
    if (!user) return;

    try {
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

        <div className="flex-1 flex justify-center">
          <h1 className="text-lg font-semibold text-foreground truncate max-w-md">
            {currentChatTitle || "New Chat"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <AgentSwitcher />
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
                isStopping={message.id === stoppingMessageId}  // ✅ Tell message to stop
                onMessageStopped={handleMessageStopped}
                onEditMessage={isAuthenticated ? handleEditMessage : undefined}
                onRegenerate={
                  isAuthenticated ? () => handleRegenerateResponse() : undefined
                }
                copyToClipboard={copyToClipboard}
                onTypewriterComplete={handleTypewriterComplete}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <div className="relative h-screen bg-chat-background flex flex-col">
      <div className="z-40">
        <ChatSidebar
          setMessages={setMessages}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onSelectConversation={handleOpenMessage}
        />
      </div>

      {renderHeader()}

      <div className={`flex flex-col flex-1 ${contentMarginClass} transition-all duration-300 min-w-0 relative z-20 pt-16`}>
        <div className="flex-1 overflow-hidden relative">
          {renderMessages()}

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

      <div className={`fixed bottom-0 left-0 right-0 z-30 ${contentMarginClass} transition-all duration-300`}>
        {isStreaming && abortController && (
          <div className="flex justify-center pb-2 animate-in fade-in duration-200">
            <Button
              onClick={handleStopGeneration}
              variant="outline"
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white border-red-600 shadow-lg transition-all duration-200 hover:scale-105"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 24 24"
                className="w-4 h-4 mr-2"
              >
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              Stop Generating
            </Button>
          </div>
        )}

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