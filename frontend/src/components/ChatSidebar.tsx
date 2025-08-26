import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Chat {
  id: string
  title: string
  timestamp: string
}

interface ChatSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function ChatSidebar({ isCollapsed, onToggle }: ChatSidebarProps) {
  const [chats] = useState<Chat[]>([
    {
      id: "1",
      title: "Getting started with cyberSync",
      timestamp: "Today"
    },
    {
      id: "2", 
      title: "React best practices",
      timestamp: "Yesterday"
    },
    {
      id: "3",
      title: "TypeScript configuration",
      timestamp: "2 days ago"
    }
  ])

  const [activeChat, setActiveChat] = useState("1")

  return (
    <div className={cn(
      "bg-chat-sidebar border-r border-border transition-all duration-300",
      isCollapsed ? "w-0 overflow-hidden" : "w-64"
    )}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className={cn(
            "font-semibold text-lg",
            isCollapsed && "hidden"
          )}>
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
              className={cn("w-4 h-4 transition-transform", isCollapsed && "rotate-180")}
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
              <div className="font-medium text-sm truncate">
                {chat.title}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {chat.timestamp}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}