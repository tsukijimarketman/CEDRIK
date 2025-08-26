import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex w-full py-6 px-4",
        role === "user"
          ? "bg-chat-message-user/30"
          : "bg-chat-message-assistant"
      )}
    >
      <div className="flex w-full max-w-4xl mx-auto">
        <div className="flex-shrink-0 w-8 h-8 mr-4">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {role === "user" ? "You" : "CS"}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground whitespace-pre-wrap break-words">
              {content}
            </p>
          </div>
          {timestamp && (
            <div className="text-xs text-muted-foreground mt-2">
              {timestamp}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
