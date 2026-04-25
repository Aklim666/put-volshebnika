import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useLoginPlayer, useRegisterPlayer } from '@wizard-path/api-client-react';
import { useSession } from '@/hooks/use-session';
import { motion, AnimatePresence } from 'framer-motion';
import { audioManager } from '@/lib/audio';
import { TypewriterText } from '@/components/typewriter-text';

const getAdmissionTexts = (name: string) => [
  "Да, всё в порядке.",
  `Имя: ${name}`,
  "Статус: допущен к экзамену.",
  "Проходите.",
  "Профессор Козьел уже ждёт вас."
];

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const [admittedName, setAdmittedName] = useState<string | null>(null);
  const [admissionStep, setAdmissionStep] = useState(0);
  const [isAdmissionTyping, setIsAdmissionTyping] = useState(true);

  const [, setLocation] = useLocation();
  const { setSession } = useSession();

  const loginMutation = useLoginPlayer();
  const registerMutation = useRegisterPlayer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ne = !name.trim();
    const pe = !password.trim();
    setNameError(ne);
    setPasswordError(pe);
    if (ne || pe) return;
    audioManager.playClick();

    try {
      if (isLogin) {
        const res = await loginMutation.mutateAsync({ data: { name, password } });
        setSession(res.playerId);
        setAdmittedName(name.trim());
        setAdmissionStep(0);
        setIsAdmissionTyping(true);
      } else {
        const res = await registerMutation.mutateAsync({ data: { name, password } });
        setSession(res.playerId);
        setAdmittedName(name.trim());
        setAdmissionStep(0);
        setIsAdmissionTyping(true);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Произошла ошибка. Попробуйте снова.');
    }
  };

  const handleAdmissionNext = () => {
    if (isAdmissionTyping) return;
    audioManager.playClick();
    const texts = getAdmissionTexts(admittedName!);
    if (admissionStep < texts.length - 1) {
      setAdmissionStep(s => s + 1);
      setIsAdmissionTyping(true);
    } else {
      setLocation('/game');
    }
  };

  useEffect(() => {
    if (!admittedName) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleAdmissionNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [admittedName, admissionStep, isAdmissionTyping]);

  const isPending = loginMutation.isPending || registerMutation.isPending;

  if (admittedName) {
    const texts = getAdmissionTexts(admittedName);
    return (
      <div
        className="min-h-screen w-full bg-[url('/images/bg-dark.jpg')] bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center p-6 relative cursor-pointer"
        onClick={handleAdmissionNext}
      >
        <div className="absolute inset-0 bg-black/70 z-0" />
        <div className="z-10 max-w-3xl w-full text-center min-h-[12rem] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={admissionStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <TypewriterText
                text={texts[admissionStep]}
                speed={50}
                className="text-2xl md:text-4xl text-primary font-display leading-normal"
                onComplete={() => setIsAdmissionTyping(false)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
        {!isAdmissionTyping && (
          <div className="absolute bottom-8 right-8 z-10 animate-pulse text-stone-400 font-sans text-sm tracking-widest">
            [ Нажмите Space, Enter или кликните для продолжения ]
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[url('/images/bg-dark.jpg')] bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-0" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md bg-stone-950/95 rounded-xl shadow-2xl border-2 border-primary/40 overflow-hidden"
      >
        <div className="p-8">
          <h2 className="text-3xl text-center font-display text-primary mb-2 font-bold tracking-widest">
            {isLogin ? 'Врата Башни' : 'Регистрация Ученика'}
          </h2>
          <div className="h-px bg-primary/30 mb-8" />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold font-display text-stone-300 mb-2 uppercase tracking-widest">
                Имя Волшебника
              </label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); if (e.target.value.trim()) setNameError(false); }}
                className={`w-full bg-stone-800 border rounded-md px-4 py-3 text-stone-100 font-sans text-base font-medium focus:outline-none focus:ring-2 transition-all placeholder:text-stone-500 ${nameError ? 'border-red-500 focus:ring-red-500/70' : 'border-stone-600 focus:ring-primary/70'}`}
                placeholder="Введи своё имя..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold font-display text-stone-300 mb-2 uppercase tracking-widest">
                Тайное Слово
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); if (e.target.value.trim()) setPasswordError(false); }}
                className={`w-full bg-stone-800 border rounded-md px-4 py-3 text-stone-100 font-sans text-base font-medium focus:outline-none focus:ring-2 transition-all placeholder:text-stone-500 ${passwordError ? 'border-red-500 focus:ring-red-500/70' : 'border-stone-600 focus:ring-primary/70'}`}
                placeholder="Введи пароль..."
              />
            </div>

            {error && (
              <div className="p-3 rounded bg-red-900/30 border border-red-700/50 text-red-300 text-sm font-sans font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 bg-primary hover:bg-yellow-500 text-stone-950 font-display font-bold uppercase tracking-widest rounded-md shadow-lg transition-all disabled:opacity-50 text-base"
            >
              {isPending ? 'Произносим заклинание...' : (isLogin ? 'Войти' : 'Вступить')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { audioManager.playClick(); setIsLogin(!isLogin); setError(''); setNameError(false); setPasswordError(false); }}
              className="text-stone-400 hover:text-primary text-sm font-sans font-medium underline transition-colors"
            >
              {isLogin ? 'Ещё не зачислен? Создать профиль' : 'Уже обучаешься? Войти'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
