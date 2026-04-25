import { useEffect, useRef } from 'react';
import { useTypewriter } from '@/hooks/use-typewriter';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { audioManager } from '@/lib/audio';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  allowSkip?: boolean;
}

export function TypewriterText({ text, speed = 40, className, onComplete, allowSkip = true }: TypewriterTextProps) {
  const { displayedText, isComplete, skip } = useTypewriter(text, speed);
  const prevLenRef = useRef(0);

  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  useEffect(() => {
    if (displayedText.length > prevLenRef.current) {
      audioManager.playTyping();
    }
    prevLenRef.current = displayedText.length;
  }, [displayedText]);

  useEffect(() => {
    if (!allowSkip) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !isComplete) {
        e.preventDefault();
        skip();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allowSkip, isComplete, skip]);

  return (
    <div className={cn("relative font-sans text-xl leading-relaxed text-foreground", className)} onClick={allowSkip && !isComplete ? skip : undefined}>
      {displayedText}
      {!isComplete && (
        <motion.span 
          animate={{ opacity: [1, 0] }} 
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="inline-block w-2 h-5 bg-primary ml-1 align-middle"
        />
      )}
    </div>
  );
}
