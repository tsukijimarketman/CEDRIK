import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { KaliGPTDialog } from "@/components/dialogs/KaliGPTDialog";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showKaliGPTDialog, setShowKaliGPTDialog] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleKaliGPTConnect = () => {
    // TODO: Implement actual connection logic to Kali GPT
    console.log("Connecting to Kali GPT...");
  };

  return (
    <>
      <KaliGPTDialog
        open={showKaliGPTDialog}
        onClose={() => setShowKaliGPTDialog(false)}
        onConfirm={handleKaliGPTConnect}
      />
      <div className="border-t border-border bg-chat-input">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setShowKaliGPTDialog(true)}
              disabled={disabled}
              className="rounded-full h-10 w-10 shrink-0"
              title="Connect to Kali GPT"
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
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                />
              </svg>
            </Button>
            <form onSubmit={handleSubmit} className="relative flex-1">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message to CEDRIK..."
                disabled={disabled}
                className="min-h-[60px] max-h-[200px] resize-none pr-12 bg-background border-input"
                rows={1}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!message.trim() || disabled}
                className="absolute bottom-2 right-2 rounded-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </Button>
            </form>
          </div>
          <div className="text-xs text-muted-foreground mt-2 text-center">
            CEDRIK can make mistakes. Consider checking important information.
          </div>
        </div>
      </div>
    </>
  );
}
