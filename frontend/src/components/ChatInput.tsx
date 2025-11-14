import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { KaliGPTDialog } from "@/components/dialogs/KaliGPTDialog";
import { useUser } from "@/contexts/UserContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showKaliGPTDialog, setShowKaliGPTDialog] = useState(false);
  const { user } = useUser();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 64), 150);
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "64px";
      }
    } else if (!user) {
      console.log("Please log in to send messages");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleKaliGPTConnect = () => {
    if (!user) {
      console.log("Please log in to use Kali GPT");
      return;
    }
    console.log("Connecting to Kali GPT...");
  };

  return (
    <>
      <KaliGPTDialog
        open={showKaliGPTDialog}
        onClose={() => setShowKaliGPTDialog(false)}
        onConfirm={handleKaliGPTConnect}
      />

      {/* Fixed container that stays at bottom */}
      <div className="border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-3">
              {/* Kali GPT Button - larger */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setShowKaliGPTDialog(true)}
                disabled={disabled}
                className="rounded-full h-10 w-10 shrink-0 border border-border/30 hover:bg-accent/30 transition-colors mb-1"
                title={
                  disabled
                    ? "Please log in to use this feature"
                    : "Connect to CEDRIK Labs"
                }
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

              {/* Textarea container with ScrollArea */}
              <div className="relative flex-1 min-w-0">
                <ScrollArea className="rounded-2xl border border-input bg-background hover:border-border/80 transition-all duration-200 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 max-h-40">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      disabled
                        ? "Please log in to chat with CEDRIK..."
                        : "Message CEDRIK..."
                    }
                    disabled={disabled}
                    className={`min-h-[64px] w-full resize-none pr-14 bg-transparent border-0 focus-visible:ring-0 focus-visible:outline-none placeholder:text-muted-foreground/70 text-base ${
                      disabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    rows={1}
                    style={{
                      height: "64px",
                      paddingRight: "4rem",
                      paddingLeft: "1.5rem",
                      paddingTop: "1rem",
                      paddingBottom: "1rem",
                    }}
                  />
                </ScrollArea>

                {/* Send button - larger */}
                <Button
                  type="submit"
                  size="sm"
                  disabled={!message.trim() || disabled}
                  className="absolute bottom-3 right-3 rounded-full h-9 w-9 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground/50 transition-colors shadow-sm z-10"
                  title={
                    disabled ? "Please log in to send messages" : "Send message"
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                </Button>
              </div>
            </div>
          </form>

          {/* Footer text */}
          <div className="mt-3">
            <div className="text-sm text-muted-foreground text-center leading-relaxed">
              {disabled
                ? "Please log in to start chatting"
                : "CEDRIK can make mistakes. Consider checking important information."}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
