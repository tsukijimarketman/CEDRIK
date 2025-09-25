import { cn } from "@/lib/utils";

export function WelcomeMessage() {
  const content = `Hello and welcome! I’m CEDRIK your AI companion, here to assist, explore ideas, and make your tasks easier.`;

  return (
    <div className="flex w-full py-6 px-4 bg-chat-message-assistant">
      <div className="flex w-full max-w-4xl mx-auto flex-row">
        <div className="flex-shrink-0 w-10 h-10 mr-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center">
            <img
              src="/cedrikFD.png"
              alt="CEDRIK"
              className="w-10 h-10 rounded-full"
            />
          </div>
        </div>

        <div className="inline-block rounded-lg p-3 max-w-[70%] mr-5">
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap break-words">{content}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
