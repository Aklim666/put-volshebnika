import { useState, useEffect } from 'react';
import { TypewriterText } from '@/components/typewriter-text';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { audioManager } from '@/lib/audio';

const INTRO_TEXTS = [
  "Приветствуем вас у врат Экзаменационной башни.",
  "Сегодня вам предстоит пройти испытание, которое покажет, готовы ли вы называться волшебником.",
  "Но сначала — проверим, значитесь ли вы в списках на сдачу экзамена сегодня."
];

export default function IntroScreen() {
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [, setLocation] = useLocation();

  const handleNext = () => {
    if (isTyping) return;
    audioManager.playClick();
    if (step < INTRO_TEXTS.length - 1) {
      setStep(s => s + 1);
      setIsTyping(true);
    } else {
      setLocation('/auth');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, isTyping]);

  return (
    <div
      className="min-h-screen w-full bg-[url('/images/bg-dark.jpg')] bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center p-6 relative cursor-pointer"
      onClick={handleNext}
    >
      <div className="absolute inset-0 bg-black/70 z-0" />

      <div className="z-10 max-w-3xl w-full text-center min-h-[12rem] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
          >
            <TypewriterText
              text={INTRO_TEXTS[step]}
              speed={45}
              className="text-2xl md:text-4xl text-primary font-display leading-normal"
              onComplete={() => setIsTyping(false)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {!isTyping && (
        <div className="absolute bottom-8 right-8 z-10 animate-pulse text-stone-400 font-sans text-sm tracking-widest">
          [ Нажмите Space, Enter или кликните для продолжения ]
        </div>
      )}
    </div>
  );
}
