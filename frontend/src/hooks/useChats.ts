import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { sidebarTitleApi } from "@/api/api";

interface Chat {
  conversation: string;
  title: string;
  created_at: Date;
}

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const { user } = useUser();

  const handleChatTitle = async () => {
    try {
      const res = await sidebarTitleApi.sidebarConversationGetTitle();
      setChats(res.data);
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  };

  const updateChatTitle = (conversationId: string, title: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.conversation === conversationId ? { ...chat, title } : chat
      )
    );
  };

  const addChat = (chat: Chat) => {
    setChats((prev) => [chat, ...prev]);
  };

  const removeChat = (conversationId: string) => {
    setChats((prev) =>
      prev.filter((chat) => chat.conversation !== conversationId)
    );
  };

  // Load chats when user changes
  useEffect(() => {
    if (user) {
      handleChatTitle();
    } else {
      setChats([]);
    }
  }, [user]);

  return {
    chats,
    updateChatTitle,
    addChat,
    removeChat,
    refreshChats: handleChatTitle,
  };
}
