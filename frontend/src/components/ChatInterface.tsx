import { useState } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMessage } from "./ChatMessage";
import { WelcomeMessage } from "./WelcomeMessage";
import { ChatInput } from "./ChatInput";
import { ThemeToggle } from "./ThemeToggle";
import { aiApi, sidebarConversationOpen } from "@/api/api";
import { useUser } from "@/contexts/UserContext";
import { useChat } from "@/contexts/ChatContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
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



export function ChatInterface() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const { activeChatId, setActiveChatId } = useChat(); // ✅ get the ID from context

  

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content,
      timestamp: new Date().toLocaleTimeString(),
    };

    // Append user message immediately
    setMessages((prev) => [...prev, userMessage]);

    // Add a temporary assistant "thinking" message
    const thinkingId = `thinking-${Date.now()}`;
    const thinkingMessage: Message = {
      id: thinkingId,
      role: "assistant",
      content: "CEDRIk is thinking...",
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, thinkingMessage]);
    setIsLoading(true);

    // Fire the AI chat request
    void aiApi
      .chat({
        conversation: activeChatId,
        content: content,
        file: null,
      })
      .then((res) => {
        const reply = res.data.reply ?? "";
        const returnedConvId = res.data.conversation;

        //  Update the conversation ID if this was a new chat
      if (returnedConvId && !activeChatId) {
          setActiveChatId(returnedConvId);
          console.log("Set conversation ID:", returnedConvId);
          //  Trigger sidebar refresh via a custom event
          window.dispatchEvent(new CustomEvent('refreshSidebar'));
          
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
      })
      .catch((err) => {
        const message = getErrorMessage(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  content: `Please Login First`,
                  timestamp: new Date().toLocaleTimeString(),
                }
              : m
          )
        );
      })
      .finally(() => setIsLoading(false));
  };

  const handleOpenMessage = async (conversation: string) => {
    try {
      const res = await sidebarConversationOpen.conversationOpen(conversation);
      setIsLoggedIn(true);
      const fetchedMessages = res.data.map(
        (msg, index) =>
          ({
            id: index.toString(),
            role: index % 2 == 0 ? "user" : "assistant",
            content: msg.text,
            timestamp: msg.created_at.toLocaleString(),
          } as Message)
      );
      setMessages(fetchedMessages);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  // Compute responsive left margin for the fixed sidebar on desktop sizes
  // When collapsed on desktop, hide the sidebar entirely and remove left margin
  const contentMarginClass = isSidebarCollapsed ? "md:ml-0" : "md:ml-64";

  const [isLoggedIn, setIsLoggedIn] = useState(null);

  return (
    <div className="relative h-screen bg-chat-background">
      <ChatSidebar
        setMessages={setMessages}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSelectConversation={handleOpenMessage}
        setIsLoggedIn={setIsLoggedIn}
        
      />

      {isLoggedIn ? (
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
              <ThemeToggle />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
            ))}
          </div>

          {/* Input */}
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
      ) : (
        <>
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
                <ThemeToggle />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <WelcomeMessage loggedOut={true} />
            </div>

            {/* Input */}
            <ChatInput onSendMessage={null} disabled={true} />
          </div>
        </>
      )}
    </div>
  );
}
