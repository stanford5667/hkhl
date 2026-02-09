import { motion, AnimatePresence } from 'framer-motion';

interface TypingIndicatorProps {
  typingUsers: { userId: string; userName: string }[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const getText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} is typing`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing`;
    }
    return `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground"
      >
        <div className="flex gap-1">
          <motion.span
            className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          />
        </div>
        <span>{getText()}</span>
      </motion.div>
    </AnimatePresence>
  );
}
