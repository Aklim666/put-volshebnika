import { useState, useEffect, useRef, useCallback } from 'react';

export function useTypewriter(text: string, speed: number = 30) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
    setDisplayedText('');
    setIsComplete(false);
    indexRef.current = 0;
  }, [text]);

  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      const current = textRef.current;
      if (indexRef.current < current.length) {
        const char = current.charAt(indexRef.current);
        setDisplayedText(current.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [isComplete, speed]);

  const skip = useCallback(() => {
    setDisplayedText(textRef.current);
    setIsComplete(true);
    indexRef.current = textRef.current.length;
  }, []);

  return { displayedText, isComplete, skip };
}
