import { cn } from "@/lib/utils";

export function WelcomeMessage() {
  const messages = [
    "Hello and welcome! I’m CEDRIK your AI companion, here to assist, explore ideas, and make your tasks easier.",
    "Hi there! CEDRIK here to help you with answers, inspiration, and guidance anytime you need.",
    "Greetings! I’m CEDRIK, ready to assist, chat, or brainstorm with you—let’s get started!",
    "Hey! I’m CEDRIK, your friendly AI assistant. Let’s make your tasks easier and more fun today.",
    "Welcome! CEDRIK at your service, here to help you explore ideas and solve problems efficiently.",
    "Hi! I’m CEDRIK, here to guide you, answer questions, and make your workflow smoother.",
    "Hello! CEDRIK ready to assist you in discovering ideas and achieving your goals today.",
    "Greetings! I’m your AI assistant, CEDRIK, here to make tasks simpler and conversations smarter.",
    "Hey there! I’m CEDRIK, ready to help you brainstorm, learn, or just have a chat anytime.",
    "Welcome! I’m CEDRIK, your AI companion, here to provide answers, tips, and support whenever you need.",
  ];

  // Pick a random message
  const content = messages[Math.floor(Math.random() * messages.length)];

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
