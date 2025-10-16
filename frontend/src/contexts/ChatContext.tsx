import { createContext, useState, useContext, ReactNode } from "react";

// Define what data you want to share
interface ChatContextType {
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
}

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Create a provider
export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  return (
    <ChatContext.Provider value={{ activeChatId, setActiveChatId }}>
      {children}
    </ChatContext.Provider>
  );
};

// Create a custom hook (for convenience)
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used inside a ChatProvider");
  return context;
};
