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
      <div
        className={cn(
          "flex w-full max-w-4xl mx-auto",
          role === "user" ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div className="flex-shrink-0 w-10 h-10 mr-4">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              role === "user" ? "bg-primary" : "bg-muted"
            )}
          >
            <img
              src={role === "user" ? "/nguso.png" : "/cedrikFD.png"}
              alt={role === "user" ? "USER" : "CEDRIK"}
              className="w-10 h-10 rounded-full"
            />
          </div>
        </div>

        <div
          className={cn(
            // "flex-1 min-w-0",
            "inline-block rounded-lg p-3",
            role === "user",
            // ? "bg-blue-500 text-white mr-5"
            // : "bg-gray-200 text-black",
            "max-w-[70%] mr-3 "
          )}
        >
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
