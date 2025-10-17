import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import "../custom-styles/WelcomeMessage.css";

export function WelcomeMessage({ loggedOut }) {
  let messages = [];

  if (loggedOut) {
    messages = [
      "Welcome! Please log in to continue our conversation.",
      "Hi there! Log in to start chatting and access your account.",
      "It looks like you’re not logged in yet. Please sign in to proceed.",
      "Welcome back! Log in to resume where we left off.",
      "Good to see you again! Please log in to continue.",
      "Please log in to start your session and begin chatting.",
      "You’re almost there! Log in to unlock your chat experience.",
      "Access restricted — please log in to continue the conversation.",
      "Let’s get started! Sign in to chat and explore more features.",
      "I’m ready when you are. Log in to start your conversation.",
    ];
  } else {
    messages = [
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
  }

  // Pick a random message only once when component mounts
  const [content, setContent] = useState("");

  useEffect(() => {
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setContent(randomMessage);
  }, []); // empty dependency array = runs only once per page load

  return (
    <div className="welcome-msg-container flex w-full gap-10 py-6 px-4 bg-chat-message-assistant">
      <img src="/public/cedrik.png" className="cedrik-img" alt="" />
      <div className="prose prose-sm max-w-none">
        <p className="whitespace-pre-wrap break-words">{content}</p>
      </div>
    </div>
  );
}
