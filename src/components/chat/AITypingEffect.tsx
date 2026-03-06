import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface AITypingEffectProps {
  content: string;
  isStreaming: boolean;
}

export function AITypingEffect({ content, isStreaming }: AITypingEffectProps) {
  const [displayedLen, setDisplayedLen] = useState(content.length);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedLen(content.length);
      return;
    }

    // Animate catching up to full content length, char by char
    if (displayedLen < content.length) {
      rafRef.current = window.setTimeout(() => {
        // Reveal multiple chars per tick for fast streaming
        const remaining = content.length - displayedLen;
        const step = remaining > 20 ? 3 : remaining > 10 ? 2 : 1;
        setDisplayedLen((prev) => Math.min(prev + step, content.length));
      }, 15);
      return () => clearTimeout(rafRef.current);
    }
  }, [content, displayedLen, isStreaming]);

  // Reset when conversation clears
  useEffect(() => {
    if (content.length === 0) setDisplayedLen(0);
  }, [content]);

  const shown = isStreaming ? content.slice(0, displayedLen) : content;

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
      <ReactMarkdown>{shown}</ReactMarkdown>
      {isStreaming && (
        <motion.span
          className="inline-block w-[3px] h-[18px] bg-primary rounded-full ml-0.5 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        />
      )}
    </div>
  );
}

export function AIThinkingIndicator() {
  return (
    <div className="flex items-start gap-1.5">
      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
      <div className="messenger-bubble-received rounded-bl-sm rounded-2xl px-3 py-2">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-muted-foreground"
              animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
