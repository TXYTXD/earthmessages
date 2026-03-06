import { useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface AITypingEffectProps {
  content: string;
  isStreaming: boolean;
}

export function AITypingEffect({ content, isStreaming }: AITypingEffectProps) {
  const prevLenRef = useRef(0);

  // Track how much content we've already shown (for fade-in only on new parts)
  useEffect(() => {
    if (!isStreaming) {
      prevLenRef.current = 0;
    }
  }, [isStreaming]);

  if (!isStreaming) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  // Split content into words, animate each new word
  const words = content.split(/(\s+)/);
  const alreadySeen = prevLenRef.current;

  // Update seen count after render
  requestAnimationFrame(() => {
    prevLenRef.current = words.length;
  });

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1 leading-relaxed">
      {words.map((word, i) => {
        const isNew = i >= alreadySeen;
        if (!word) return null;

        // Whitespace
        if (/^\s+$/.test(word)) return <span key={i}>{word}</span>;

        return isNew ? (
          <motion.span
            key={`${i}-${word}`}
            initial={{ opacity: 0, filter: "blur(4px)", y: 2 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="inline"
          >
            {word}
          </motion.span>
        ) : (
          <span key={i} className="inline">{word}</span>
        );
      })}
      <motion.span
        className="inline-block w-[3px] h-[18px] bg-primary rounded-full ml-0.5 align-middle"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
      />
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
