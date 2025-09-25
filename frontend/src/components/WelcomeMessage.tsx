import { cn } from "@/lib/utils";

export function WelcomeMessage() {
  const messages = [
    "Hey there! I’m CEDRIK, your AI buddy—let’s tackle your tasks and explore ideas together!",
    "Hi! I’m CEDRIK. Need answers, tips, or just someone to brainstorm with? I got you!",
    "Hello! I’m CEDRIK, ready to help you out and make things a little easier and fun today.",
    "Hey! I’m CEDRIK, your friendly AI assistant. Let’s make your day smoother and more productive!",
    "Welcome! I’m CEDRIK, here to help you figure things out and spark some creative ideas.",
    "Hiya! I’m CEDRIK, ready to guide you, answer questions, or just chat whenever you want.",
    "Hey! I’m CEDRIK, your AI companion, here to make work simpler and brainstorming a breeze.",
    "Hello there! I’m CEDRIK, ready to help you solve problems, learn new things, or just hang out.",
    "Hi! I’m CEDRIK, excited to chat, share ideas, and help make your day a little easier.",
    "Hey there! I’m CEDRIK, your AI friend—here for answers, tips, or just a friendly chat anytime!",
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
