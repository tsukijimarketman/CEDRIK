import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/contexts/UserContext";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  isEdited?: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onRegenerate?: () => void;
  messageId: string;
  copyToClipboard: (text: string) => Promise<boolean>;
  isNewMessage?: boolean;
  onTypewriterComplete?: () => void;
}

export function ChatMessage({
  role,
  content,
  timestamp,
  isEdited = false,
  onEditMessage,
  onRegenerate,
  messageId,
  copyToClipboard,
  isNewMessage = false,
  onTypewriterComplete,
}: ChatMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null);
  const [displayedContent, setDisplayedContent] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [copyFeedback, setCopyFeedback] = useState<"none" | "code" | "all">(
    "none"
  );

  const { user } = useUser();

  const isUser = role === "user";

  // Track if this is the first time this message content is received
  const isFirstRender = useRef(true);

  // Typewriter effect only for new assistant messages
  useEffect(() => {
    if (
      isUser ||
      content === "CEDRIK is thinking..." ||
      content.startsWith("Error:") ||
      content.startsWith("Please Login First")
    ) {
      setDisplayedContent(content);
      setIsTypingComplete(true);
      return;
    }

    if (isNewMessage && isFirstRender.current) {
      if (currentIndex < content.length) {
        const timer = setTimeout(() => {
          setDisplayedContent(content.slice(0, currentIndex + 1));
          setCurrentIndex(currentIndex + 1);
        }, 20);

        return () => clearTimeout(timer);
      } else {
        setIsTypingComplete(true);
        isFirstRender.current = false;
        if (onTypewriterComplete) {
          onTypewriterComplete();
        }
      }
    } else {
      setDisplayedContent(content);
      setIsTypingComplete(true);
    }
  }, [currentIndex, content, isUser, isNewMessage, onTypewriterComplete]);

  useEffect(() => {
    if (content !== displayedContent && !isNewMessage) {
      // If content changed but this isn't a new message (likely an edit), update immediately
      setDisplayedContent(content);
      setIsTypingComplete(true);
      isFirstRender.current = false;
    }
  }, [content, displayedContent, isNewMessage]);

  // Reset typewriter effect when we get a truly new message
  useEffect(() => {
    if (
      !isUser &&
      isNewMessage &&
      content !== "CEDRIK is thinking..." &&
      !content.startsWith("Error:") &&
      !content.startsWith("Please Login First")
    ) {
      setDisplayedContent("");
      setCurrentIndex(0);
      setIsTypingComplete(false);
      isFirstRender.current = true;
    } else if (!isNewMessage) {
      setDisplayedContent(content);
      setIsTypingComplete(true);
    }
  }, [content, isUser, isNewMessage]);

  // Scroll into view when typing is complete or for user messages
  useEffect(() => {
    if (isUser || isTypingComplete) {
      messageRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isUser, isTypingComplete, displayedContent]);

  // Copy code block
  const handleCopyCode = async (code: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopyFeedback("code");
      setTimeout(() => setCopyFeedback("none"), 2000);
    }
  };

  // Copy entire message
  const handleCopyAll = async () => {
    const textToCopy = isUser ? content : displayedContent;
    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopyFeedback("all");
      setTimeout(() => setCopyFeedback("none"), 2000);
    }
  };

  
  // Save edited message
  const handleSaveEdit = () => {
    if (onEditMessage && editedContent.trim() !== content) {
      onEditMessage(messageId, editedContent.trim());
    }
    setIsEditing(false);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const CodeBlock = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => {
    const isCodeBlock = className && className.startsWith("language-");
    const codeString = String(children).replace(/\n$/, "");
    const language = className?.replace("language-", "") || "text";

    if (isCodeBlock) {
      return (
        <div className="relative my-4 group overflow-hidden w-full">
          {/* Header with language and copy button */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-t-lg border-b border-gray-700">
            <span className="text-xs text-gray-300 font-mono capitalize">
              {language}
            </span>
            <button
              onClick={() => handleCopyCode(codeString)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors flex-shrink-0 ml-2"
              title="Copy code"
            >
              {copyFeedback === "code" ? (
                <>
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Syntax-highlighted code content with horizontal scrolling */}
          <ScrollArea className="bg-gray-900 rounded-b-lg w-full" type="always">
            <div className="p-4 min-w-max">
              <SyntaxHighlighter
                language={language}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: 0,
                  fontSize: "0.875rem",
                  lineHeight: "1.25rem",
                  background: "transparent",
                  minWidth: "100%",
                }}
                showLineNumbers={codeString.split("\n").length > 5}
                lineNumberStyle={{
                  color: "#6b7280",
                  minWidth: "2.5em",
                  paddingRight: "1em",
                  textAlign: "right",
                  userSelect: "none",
                }}
                wrapLines={false}
                codeTagProps={{
                  style: {
                    display: "block",
                    overflow: "auto",
                  },
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
            {/* ScrollBars go here - AFTER the content */}
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>
      );
    }

    // Inline code styling
    return (
      <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 break-words">
        {children}
      </code>
    );
  };

  const renderMessageActions = () => (
    <div
      className={cn(
        "flex gap-2 mt-3 transition-opacity",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && isTypingComplete && onRegenerate && (
        <>
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 p-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            title="Copy entire message"
          >
            {copyFeedback === "all" ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1 p-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            title="Regenerate response"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </>
      )}
      {isUser && onEditMessage && (
        <>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 p-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              title="Edit message"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          ) : (
            <>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1 p-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
                title="Save changes"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1 p-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                title="Cancel editing"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </>
          )}
        </>
      )}
    </div>
  );

  const renderMessageContent = () => {
    if (isEditing) {
      return (
        <div className="space-y-2">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            autoFocus
            placeholder="Edit your message..."
          />
        </div>
      );
    }

    return (
      <div
        className={cn(
          "prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-relaxed prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:font-semibold prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-em:italic prose-em:text-gray-600 dark:prose-em:text-gray-400 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-blockquote:border-l-blue-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-800/50 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 w-full break-words overflow-wrap-anywhere",
          isUser ? "text-right" : "text-left" // Added conditional text alignment
        )}
      >
        <ReactMarkdown
          components={{
            strong: ({ children }) => (
              <strong className="font-semibold text-gray-900 dark:text-gray-100">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-gray-600 dark:text-gray-400">
                {children}
              </em>
            ),
            p: ({ children }) => (
              <p
                className={cn(
                  "mb-3 last:mb-0 text-gray-700 dark:text-gray-300 leading-relaxed break-words overflow-wrap-anywhere",
                  isUser ? "text-right" : "text-left" // Added conditional text alignment
                )}
              >
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul
                className={cn(
                  "list-disc list-inside mb-3 space-y-1 text-gray-700 dark:text-gray-300 break-words overflow-wrap-anywhere",
                  isUser ? "text-right" : "text-left" // Added conditional text alignment
                )}
              >
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol
                className={cn(
                  "list-decimal list-inside mb-3 space-y-1 text-gray-700 dark:text-gray-300 break-words overflow-wrap-anywhere",
                  isUser ? "text-right" : "text-left" // Added conditional text alignment
                )}
              >
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li
                className={cn(
                  "text-gray-700 dark:text-gray-300 break-words overflow-wrap-anywhere",
                  isUser ? "text-right" : "text-left" // Added conditional text alignment
                )}
              >
                {children}
              </li>
            ),
            blockquote: ({ children }) => (
              <blockquote
                className={cn(
                  "border-l-4 border-blue-500 bg-gray-50 dark:bg-gray-800/50 italic text-gray-600 dark:text-gray-400 py-2 px-4 my-3 rounded-r break-words overflow-wrap-anywhere",
                  isUser ? "text-right" : "text-left" // Added conditional text alignment
                )}
              >
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-3">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg break-words">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600 break-words overflow-wrap-anywhere">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 break-words overflow-wrap-anywhere">
                {children}
              </td>
            ),
            code: CodeBlock,
            pre: ({ children }) => (
              <div className="my-3 w-full overflow-hidden">{children}</div>
            ),
          }}
        >
          {isUser ? content : displayedContent}
        </ReactMarkdown>

        {/* Show blinking cursor for assistant messages that are still typing */}
        {!isUser && !isTypingComplete && isNewMessage && (
          <span className="ml-0.5 animate-pulse text-gray-400">▊</span>
        )}
      </div>
    );
  };

  const renderTimestamp = () =>
    timestamp &&
    (isUser || isTypingComplete) && (
      <div
        className={cn(
          "text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        <span>{timestamp}</span>
        {isEdited && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            (edited)
          </span>
        )}
      </div>
    );

  return (
    <div
      ref={messageRef}
      className={cn("flex w-full py-6 px-4 bg-blue-100/50 dark:bg-blue-900/20")}
    >
      <div
        className={cn(
          "flex w-full max-w-4xl mx-auto", // This already has max-w-4xl
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar - Fixed */}
        <div className={cn("flex-shrink-0", isUser ? "ml-4" : "mr-4")}>
          <Avatar className="w-10 h-10 border-2">
            {isUser ? (
              <>
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                    user?.username || "user"
                  }`}
                  alt="USER"
                />
                <AvatarFallback className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </>
            ) : (
              <>
                <AvatarImage
                  src="/cedriklogo.png"
                  alt="CEDRIK"
                  className="object-contain bg-white"
                />
                <AvatarFallback className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  C
                </AvatarFallback>
              </>
            )}
          </Avatar>
        </div>

        {/* Message Content */}
        <div
          className={cn("flex-1 min-w-0", isUser ? "text-right" : "text-left")}
        >
          {/* Message bubble */}
          <div
            className={cn(
              "inline-block max-w-full break-words",
              isUser
                ? "bg-blue-500 text-white rounded-l-2xl rounded-tr-2xl rounded-br-sm ml-auto text-right" // No w-full for user
                : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-r-2xl rounded-tl-2xl rounded-bl-sm text-left w-full", // w-full for assistant
              "px-4 py-3 shadow-sm"
            )}
            style={{ maxWidth: "calc(100vw - 2rem)" }}
          >
            {renderMessageContent()}
          </div>

          {/* Action Buttons - Always visible */}
          {renderMessageActions()}

          {/* Timestamp and edited indicator */}
          {renderTimestamp()}
        </div>
      </div>
    </div>
  );
}
