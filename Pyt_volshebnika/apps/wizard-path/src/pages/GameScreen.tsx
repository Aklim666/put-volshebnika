import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useGetPlayer, useUpdatePlayerStats, useResetPlayerQuests } from '@wizard-path/api-client-react';
import { useSession } from '@/hooks/use-session';
import { ExamCard } from '@/components/exam-card';
import { TypewriterText } from '@/components/typewriter-text';
import { quest1Data, quest2Data, quest3Data, type StatChanges, type QuestStep } from '@/lib/quests';
import { motion, AnimatePresence } from 'framer-motion';
import { audioManager } from '@/lib/audio';
import { cn } from '@/lib/utils';

type GameState = 'MASTER' | 'PORTALS' | 'QUEST' | 'QUEST_END' | 'FINAL' | 'FINAL_YES' | 'RETURNING_ALL';

const MASTER_INTRO_DIALOGS = [
  "Здравствуй, мой дорогой ученик. Сегодня важный день.",
  "Я наблюдал за твоими успехами на протяжении всего обучения. Ты талантлив и умён.",
  "Поэтому для тебя я подготовил особое испытание.",
  "Уже сейчас тебя можно назвать выдающимся магом, поэтому результатом сегодняшнего экзамена для тебя будет — знание своего пути.",
  "Я подготовил для тебя несколько испытаний, проходя их, у тебя будут повышаться или уменьшаться показатели, написанные в твоей экзаменационной карте.",
  "Проходи испытания так, как считаешь нужным, а по их завершении я посмотрю на твои результаты и предскажу твоё будущее.",
  "Удачи, мой ученик."
];

const MASTER_FINAL_DIALOGS = [
  "Поздравляю, мой ученик. Ты благополучно завершил сдачу своего экзамена.",
  "Ты хорошо справился, хоть и было не просто.",
  "Теперь я посмотрю на твои результаты — и мы узнаем, какой же путь тебе предназначен.",
  "Хмм... Ну что ж, слушай."
];

/**
 * Функция расчёта архетипа
 *
 * ЛОГИКА:
 * 1. Сначала проверяем строгие условия архетипов
 * 2. Если не подошло — проверяем "мягкие" версии (порог снижен)
 * 3. Изгой — только если ≥3 характеристик отрицательные ИЛИ совсем ничего не подошло
 */
function calculateArchetype(
  compassion: number,
  courage: number,
  wisdom: number,
  ambition: number,
  principle: number
): string {
  console.log('[Archetype] Характеристики:', { compassion, courage, wisdom, ambition, principle });
  
  // Считаем количество отрицательных характеристик
  const negativeCount = [compassion, courage, wisdom, ambition, principle].filter(v => v < 0).length;
  
  // Если ≥3 отрицательных → Изгой (очень редко)
  if (negativeCount >= 3) {
    console.log('[Archetype] → ИЗГОЙ (≥3 отрицательных характеристик)');
    return "Изгой";
  }
  
  // ============================================================================
  // СТРОГИЕ УСЛОВИЯ (оригинальные)
  // ============================================================================
  
  // 1. НАСТАВНИК: ВСЕ >= 6
  if (compassion >= 6 && courage >= 6 && wisdom >= 6 && ambition >= 6 && principle >= 6) {
    console.log('[Archetype] → НАСТАВНИК (все >= 6)');
    return "Наставник";
  }

  // 2. МРАК: Амбиции >= 7 И Сострадание <= 3
  if (ambition >= 7 && compassion <= 3) {
    console.log('[Archetype] → МРАК (ambition >= 7 && compassion <= 3)');
    return "Мрак";
  }

  // 3. ВЛАСТИТЕЛЬ: Амбиции >= 6 И Сострадание >= 5
  if (ambition >= 6 && compassion >= 5) {
    console.log('[Archetype] → ВЛАСТИТЕЛЬ (ambition >= 6 && compassion >= 5)');
    return "Властитель";
  }

  // 4. ЦЕЛИТЕЛЬ: Сострадание >= 6 И Смелость <= 4
  if (compassion >= 6 && courage <= 4) {
    console.log('[Archetype] → ЦЕЛИТЕЛЬ (compassion >= 6 && courage <= 4)');
    return "Целитель";
  }

  // 5. БОРЕЦ ЗА ПОРЯДОК: Принципиальность >= 6 И Сострадание <= 4
  if (principle >= 6 && compassion <= 4) {
    console.log('[Archetype] → БОРЕЦ ЗА ПОРЯДОК (principle >= 6 && compassion <= 4)');
    return "Борец за порядок";
  }
  
  // ============================================================================
  // МЯГКИЕ УСЛОВИЯ (сниженный порог — более достижимые)
  // ============================================================================
  
  // МРАК (мягкий): Амбиции >= 5 И Сострадание <= 3
  if (ambition >= 5 && compassion <= 3) {
    console.log('[Archetype] → МРАК (мягкий: ambition >= 5 && compassion <= 3)');
    return "Мрак";
  }
  
  // ВЛАСТИТЕЛЬ (мягкий): Амбиции >= 4 И Сострадание >= 4
  if (ambition >= 4 && compassion >= 4) {
    console.log('[Archetype] → ВЛАСТИТЕЛЬ (мягкий: ambition >= 4 && compassion >= 4)');
    return "Властитель";
  }
  
  // ЦЕЛИТЕЛЬ (мягкий): Сострадание >= 4 И Смелость <= 4
  if (compassion >= 4 && courage <= 4) {
    console.log('[Archetype] → ЦЕЛИТЕЛЬ (мягкий: compassion >= 4 && courage <= 4)');
    return "Целитель";
  }
  
  // БОРЕЦ ЗА ПОРЯДОК (мягкий): Принципиальность >= 4 И Сострадание <= 4
  if (principle >= 4 && compassion <= 4) {
    console.log('[Archetype] → БОРЕЦ ЗА ПОРЯДОК (мягкий: principle >= 4 && compassion <= 4)');
    return "Борец за порядок";
  }
  
  // НАСТАВНИК (мягкий): ВСЕ >= 4 (очень редко, но возможно)
  if (compassion >= 4 && courage >= 4 && wisdom >= 4 && ambition >= 4 && principle >= 4) {
    console.log('[Archetype] → НАСТАВНИК (мягкий: все >= 4)');
    return "Наставник";
  }
  
  // ============================================================================
  // ОПРЕДЕЛЕНИЕ ПО ДОМИНИРУЮЩЕЙ ХАРАКТЕРИСТИКЕ
  // ============================================================================
  
  // Находим максимальную характеристику
  const maxStat = Math.max(compassion, courage, wisdom, ambition, principle);
  
  // Если все характеристики близки к 0 или отрицательные → Изгой
  if (maxStat <= 2 && negativeCount >= 1) {
    console.log('[Archetype] → ИЗГОЙ (все характеристики низкие)');
    return "Изгой";
  }
  
  // Определяем по доминирующей характеристике
  if (ambition === maxStat && ambition >= 2) {
    console.log('[Archetype] → МРАК (по доминирующей амбиции)');
    return "Мрак";
  }
  
  if (compassion === maxStat && compassion >= 2) {
    if (courage <= 4) {
      console.log('[Archetype] → ЦЕЛИТЕЛЬ (по доминирующему состраданию)');
      return "Целитель";
    } else if (ambition >= 3) {
      console.log('[Archetype] → ВЛАСТИТЕЛЬ (по состраданию + амбиции)');
      return "Властитель";
    }
  }
  
  if (principle === maxStat && principle >= 2) {
    console.log('[Archetype] → БОРЕЦ ЗА ПОРЯДОК (по доминирующей принципиальности)');
    return "Борец за порядок";
  }
  
  if (wisdom === maxStat && wisdom >= 2) {
    console.log('[Archetype] → НАСТАВНИК (по доминирующей мудрости)');
    return "Наставник";
  }
  
  if (courage === maxStat && courage >= 2) {
    console.log('[Archetype] → ЦЕЛИТЕЛЬ (по доминирующей смелости)');
    return "Целитель";
  }
  
  // Если совсем ничего не подошло → Изгой
  console.log('[Archetype] → ИЗГОЙ (ни один архетип не подошёл)');
  return "Изгой";
}

const ARCHETYPE_COLORS: Record<string, string> = {
  "Наставник": "from-amber-900/80 to-yellow-900/80",
  "Мрак": "from-purple-950/90 to-black/90",
  "Властитель": "from-indigo-900/80 to-blue-900/80",
  "Целитель": "from-emerald-900/80 to-teal-900/80",
  "Борец за порядок": "from-stone-800/80 to-stone-950/90",
  "Изгой": "from-gray-700/80 to-slate-900/80",
};

const ALL_QUEST_IMAGES = [
  '/images/btn-q1-dragon.jpg', '/images/btn-q1-villagers.jpg', '/images/btn-q1-magic.jpg',
  '/images/btn-q1-skull.jpg', '/images/btn-q1-forest.jpg', '/images/btn-q1-night.jpg',
  '/images/btn-q1-question.jpg', '/images/btn-q1-dots.jpg',
  '/images/btn-q2-bag1.jpg', '/images/btn-q2-bag2.jpg', '/images/btn-q2-bag3.jpg',
  '/images/btn-q2-bag-small.jpg', '/images/btn-q2-jewels.jpg', '/images/btn-q2-chest.jpg',
  '/images/btn-q2-shield.jpg', '/images/btn-q2-check.jpg', '/images/btn-q2-cross.jpg',
  '/images/btn-q3-potion.jpg', '/images/btn-q3-mirror.jpg', '/images/btn-q3-key.jpg',
  '/images/btn-q3-all.jpg', '/images/btn-q3-knowledge.jpg', '/images/btn-q3-megaphone.jpg',
  '/images/btn-q3-lock.jpg', '/images/btn-q3-chalice.jpg',
  '/images/portal-1.jpg', '/images/portal-2.jpg', '/images/portal-3.jpg',
];

export default function GameScreen() {
  const [, setLocation] = useLocation();
  const { playerId, clearSession } = useSession();

  useEffect(() => {
    ALL_QUEST_IMAGES.forEach(src => { const img = new Image(); img.src = src; });
  }, []);

  const { data: player, isLoading, refetch } = useGetPlayer(playerId as number, { query: { enabled: !!playerId, queryKey: ['getPlayer', playerId] } });
  const updateStats = useUpdatePlayerStats();
  const resetQuests = useResetPlayerQuests();

  const [gameState, setGameState] = useState<GameState>('MASTER');
  const [masterStep, setMasterStep] = useState(0);
  const [finalStep, setFinalStep] = useState(0);
  const [isMasterTyping, setIsMasterTyping] = useState(true);
  const [isFinalTyping, setIsFinalTyping] = useState(true);
  const [activeQuestId, setActiveQuestId] = useState<number | null>(null);
  const [questStepId, setQuestStepId] = useState<string>('root');
  const [isExamCardOpen, setIsExamCardOpen] = useState(false);
  const [showStatChanges, setShowStatChanges] = useState<StatChanges | null>(null);
  const [questEndOverlay, setQuestEndOverlay] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const [isTextComplete, setIsTextComplete] = useState(false);
  const [isProcessingChoice, setIsProcessingChoice] = useState(false);
  const [pendingStats, setPendingStats] = useState<StatChanges>({});
  const [questEndText, setQuestEndText] = useState<string | null>(null);
  const [isQuestEndTextTyping, setIsQuestEndTextTyping] = useState(false);
  const [archetypeAiText, setArchetypeAiText] = useState<string>('');
  const [isLoadingAiText, setIsLoadingAiText] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!playerId) setLocation('/auth');
  }, [playerId, setLocation]);

  // Возвращающийся игрок видит экран ВЫБОРА
  useEffect(() => {
    if (!player || hasInitialized.current) return;
    hasInitialized.current = true;
    
    const completed = player.completedQuests ?? [];
    const previousArchetypes = player.previousArchetypes ?? [];
    const archetypeEarned = player.archetypeEarned;
    
    console.log('[Game] Игрок загрузился:', { 
      completedQuests: completed.length, 
      previousArchetypes: previousArchetypes.length,
      archetypeEarned,
    });
    
    if (archetypeEarned !== null || previousArchetypes.length > 0) {
      console.log('[Game] → Возвращающийся игрок, RETURNING_ALL');
      setGameState('RETURNING_ALL');
    } else if (completed.length >= 3) {
      console.log('[Game] → Все квесты пройдены, FINAL');
      setGameState('FINAL');
    } else if (completed.length > 0) {
      console.log('[Game] → Продолжение, PORTALS');
      setGameState('PORTALS');
    } else {
      console.log('[Game] → Новый игрок, MASTER');
      setGameState('MASTER');
    }
  }, [player]);

  useEffect(() => {
    setButtonsVisible(false);
    setIsTextComplete(false);
  }, [questStepId, gameState]);

  const handleLogout = useCallback(() => {
    clearSession();
    setLocation('/');
  }, [clearSession, setLocation]);

  const handleMasterNext = useCallback(() => {
    if (isMasterTyping) return;
    audioManager.playClick();
    if (masterStep < MASTER_INTRO_DIALOGS.length - 1) {
      setMasterStep(s => s + 1);
      setIsMasterTyping(true);
    } else {
      setGameState('PORTALS');
    }
  }, [isMasterTyping, masterStep]);

  useEffect(() => {
    if (gameState !== 'MASTER') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); handleMasterNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, handleMasterNext]);

  const handleFinalNext = useCallback(() => {
    if (isFinalTyping) return;
    audioManager.playClick();
    if (finalStep < MASTER_FINAL_DIALOGS.length - 1) {
      setFinalStep(s => s + 1);
      setIsFinalTyping(true);
    } else {
      goToFinalYes();
    }
  }, [isFinalTyping, finalStep]);

  const goToFinalYes = useCallback(() => {
    if (!player) return;
    
    const arch = calculateArchetype(player.compassion, player.courage, player.wisdom, player.ambition, player.principle);
    console.log('[Game] Финальный архетип:', arch);
    
    setGameState('FINAL_YES');
    setIsLoadingAiText(true);

    console.log('[Game] Сохранение архетипа в БД...');
    updateStats.mutateAsync({
      playerId: player.playerId,
      data: {
        compassionDelta: 0,
        courageDelta: 0,
        wisdomDelta: 0,
        ambitionDelta: 0,
        principleDelta: 0,
        questId: 0,
        archetypeEarned: arch,
      }
    }).then(() => {
      console.log('[Game] Архетип сохранён в БД');
      refetch();
    }).catch((err) => {
      console.error('[Game] Ошибка сохранения архетипа:', err);
    });

    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    console.log('[Game] Запрос к API архетип-текста...');
    
    fetch(`${base}/api/archetype-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        archetype: arch,
        compassion: player.compassion,
        courage: player.courage,
        wisdom: player.wisdom,
        ambition: player.ambition,
        principle: player.principle,
      }),
    })
      .then(r => {
        console.log('[Game] API ответ:', r.status);
        return r.json();
      })
      .then((data: { text: string }) => {
        console.log('[Game] Получено предсказание от ИИ:', data.text);
        setArchetypeAiText(data.text);
        setIsLoadingAiText(false);
      })
      .catch((err) => {
        console.error('[Game] Ошибка получения предсказания:', err);
        setArchetypeAiText("Твой путь уникален. Лишь время покажет, кем ты станешь.");
        setIsLoadingAiText(false);
      });
  }, [player]);

  useEffect(() => {
    if (gameState !== 'FINAL') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); handleFinalNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, handleFinalNext]);

  useEffect(() => {
    if (!questEndOverlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); handleQuestEndContinue(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [questEndOverlay]);

  const handleQuestStart = (id: number) => {
    if (!player || player.completedQuests.includes(id)) return;
    audioManager.playClick();
    setActiveQuestId(id);
    setQuestStepId('root');
    setQuestEndOverlay(false);
    setPendingStats({});
    setGameState('QUEST');
  };

  const getQuestData = (id: number | null) => {
    if (id === 1) return quest1Data;
    if (id === 2) return quest2Data;
    if (id === 3) return quest3Data;
    return quest1Data;
  };

  const currentStepData: QuestStep | undefined = activeQuestId
    ? getQuestData(activeQuestId)[questStepId]
    : undefined;

  const handleChoice = async (changes: StatChanges, nextStep?: string, isEnd?: boolean, endText?: string) => {
    if (isProcessingChoice) return;
    audioManager.playClick();
    setIsProcessingChoice(true);
    setButtonsVisible(false);
    setShowStatChanges(changes);

    await new Promise(r => setTimeout(r, 2200));
    setShowStatChanges(null);

    const accumulated: StatChanges = {
      compassion: (pendingStats.compassion || 0) + (changes.compassion || 0),
      courage: (pendingStats.courage || 0) + (changes.courage || 0),
      wisdom: (pendingStats.wisdom || 0) + (changes.wisdom || 0),
      ambition: (pendingStats.ambition || 0) + (changes.ambition || 0),
      principle: (pendingStats.principle || 0) + (changes.principle || 0),
    };

    if (isEnd && activeQuestId && player) {
      try {
        await updateStats.mutateAsync({
          playerId: player.playerId,
          data: {
            compassionDelta: accumulated.compassion || 0,
            courageDelta: accumulated.courage || 0,
            wisdomDelta: accumulated.wisdom || 0,
            ambitionDelta: accumulated.ambition || 0,
            principleDelta: accumulated.principle || 0,
            questId: activeQuestId
          }
        });
        await refetch();
      } catch (e) {
        console.error('Error updating stats', e);
      }
      setPendingStats({});
      if (endText) {
        setQuestEndText(endText);
        setIsQuestEndTextTyping(true);
        setIsProcessingChoice(false);
      } else {
        setQuestEndOverlay(true);
        setIsProcessingChoice(false);
      }
    } else if (nextStep) {
      setPendingStats(accumulated);
      setQuestStepId(nextStep);
      setIsTextComplete(false);
      setButtonsVisible(false);
      setIsProcessingChoice(false);
    } else {
      setIsProcessingChoice(false);
    }
  };

  const handleQuestEndTextContinue = useCallback(() => {
    if (isQuestEndTextTyping) return;
    audioManager.playClick();
    setQuestEndText(null);
    setQuestEndOverlay(true);
  }, [isQuestEndTextTyping]);

  useEffect(() => {
    if (!questEndText) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleQuestEndTextContinue(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [questEndText, handleQuestEndTextContinue]);

  const handleQuestEndContinue = useCallback(() => {
    audioManager.playClick();
    setQuestEndOverlay(false);
    setActiveQuestId(null);
    if (player && player.completedQuests.length >= 3) {
      setFinalStep(0);
      setIsFinalTyping(true);
      setGameState('FINAL');
    } else {
      setGameState('PORTALS');
    }
  }, [player]);

  if (isLoading || !player) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const archetype = calculateArchetype(player.compassion, player.courage, player.wisdom, player.ambition, player.principle);
  const archetypeGradient = ARCHETYPE_COLORS[archetype] ?? ARCHETYPE_COLORS["Изгой"];

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-black text-foreground select-none">
      {(gameState === 'MASTER' || gameState === 'PORTALS' || gameState === 'RETURNING_ALL') && (
        <button
          onClick={() => { audioManager.playClick(); setIsExamCardOpen(true); }}
          className="absolute top-4 left-4 z-40 bg-stone-900/80 border border-primary/50 text-primary px-4 py-2 rounded-full font-display uppercase tracking-widest text-sm hover:bg-stone-800 hover:scale-105 transition-all shadow-lg backdrop-blur-sm"
        >
          Карта
        </button>
      )}

      <ExamCard
        isOpen={isExamCardOpen}
        onClose={() => setIsExamCardOpen(false)}
        player={player}
        onLogout={handleLogout}
      />

      <AnimatePresence mode="wait">

        {gameState === 'RETURNING_ALL' && (
          <motion.div
            key="returning-all"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-cover bg-center flex flex-col items-center justify-center p-8"
            style={{ backgroundImage: "url('/images/bg-master.jpg')" }}
          >
            <div className="absolute inset-0 bg-black/65 z-0" />
            <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full">
              <img src="/images/master.gif" alt="" className="h-40 w-auto object-contain drop-shadow-[0_0_30px_rgba(212,175,55,0.4)] pointer-events-none" />
              <p className="text-xl md:text-2xl font-display text-stone-200 text-center tracking-wide leading-relaxed">
                С возвращением, ученик. Ты уже прошёл все испытания.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <button
                  onClick={() => { audioManager.playClick(); setIsExamCardOpen(true); }}
                  className="flex-1 py-4 bg-stone-800/90 hover:bg-stone-700 text-primary border border-primary/50 font-display font-bold uppercase tracking-widest rounded-lg shadow-lg transition-all text-sm hover:scale-105"
                >
                  Экзаменационная карта
                </button>
                <button
                  onClick={async () => {
                    audioManager.playClick();
                    await resetQuests.mutateAsync({ playerId: player!.playerId });
                    await refetch();
                    setPendingStats({});
                    setMasterStep(0);
                    setIsMasterTyping(true);
                    setGameState('MASTER');
                  }}
                  className="flex-1 py-4 bg-primary hover:bg-yellow-500 text-stone-950 font-display font-bold uppercase tracking-widest rounded-lg shadow-lg transition-all text-sm hover:scale-105"
                >
                  Пройти заново
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'MASTER' && (
          <motion.div
            key="master"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            className="absolute inset-0 bg-cover bg-center cursor-pointer"
            style={{ backgroundImage: "url('/images/bg-master.jpg')" }}
            onClick={handleMasterNext}
          >
            <div className="absolute inset-0 bg-black/50 z-0" />
            <img src="/images/master.gif" alt="Профессор Козель" className="absolute bottom-28 left-1/2 -translate-x-1/2 h-[68vh] w-auto object-contain z-10 drop-shadow-[0_0_40px_rgba(212,175,55,0.45)] pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-stone-950/92 border-t-2 border-primary/30 px-8 py-6 h-[160px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div key={masterStep} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <TypewriterText text={MASTER_INTRO_DIALOGS[masterStep]} speed={35} className="text-xl md:text-2xl font-sans text-stone-100 font-semibold leading-relaxed" onComplete={() => setIsMasterTyping(false)} />
                </motion.div>
              </AnimatePresence>
              {!isMasterTyping && (
                <div className="text-right mt-3 text-primary/70 text-xs font-display tracking-widest animate-pulse">
                  [ Пробел / Enter / Клик — далее ]
                </div>
              )}
            </div>
          </motion.div>
        )}

        {gameState === 'PORTALS' && (
          <motion.div
            key="portals"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-cover bg-center flex flex-col items-center justify-center p-6"
            style={{ backgroundImage: "url('/images/bg-dark.jpg')" }}
          >
            <div className="absolute inset-0 bg-black/65 z-0" />
            <h2 className="z-10 text-3xl md:text-4xl font-display text-primary mb-12 text-center tracking-widest drop-shadow-lg">
              Выбери своё испытание
            </h2>
            <div className="z-10 flex flex-col md:flex-row gap-8 md:gap-16 items-center justify-center">
              {[
                { id: 1, title: 'Дракон в разрушенной деревне', img: 'portal-1.jpg' },
                { id: 2, title: 'Голодающий город', img: 'portal-2.jpg' },
                { id: 3, title: 'Выбор', img: 'portal-3.jpg' }
              ].map(portal => {
                const isCompleted = player.completedQuests.includes(portal.id);
                return (
                  <div key={portal.id} className={cn("relative group", isCompleted ? "cursor-not-allowed" : "cursor-pointer")} onClick={() => handleQuestStart(portal.id)} title={isCompleted ? 'Квест пройден' : portal.title}>
                    <div className={cn("w-44 h-64 md:w-56 md:h-80 rounded-2xl overflow-hidden transition-all duration-500 shadow-2xl", isCompleted ? "grayscale opacity-30" : "hover:scale-110 hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] hover:border-2 hover:border-primary/60")}>
                      <img src={`/images/${portal.img}`} className="w-full h-full object-cover" alt={portal.title} />
                    </div>
                    {!isCompleted && (
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-950/90 px-4 py-2 rounded text-primary font-display text-xs tracking-wide opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-primary/20">
                        {portal.title}
                      </div>
                    )}
                    {isCompleted && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl opacity-60">✓</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {gameState === 'QUEST' && currentStepData && (
          <motion.div
            key={`quest-${questStepId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-cover bg-center flex flex-col items-center p-6 md:p-12 overflow-y-auto"
            style={{ backgroundImage: "url('/backgrounds/quest.jpg')" }}
          >
            <div className="z-10 w-full max-w-4xl mt-8 mb-8 bg-stone-950/80 rounded-xl p-6 md:p-8 border border-stone-700/50 shadow-xl">
              <TypewriterText text={currentStepData.text} speed={28} className="text-lg md:text-xl font-sans text-stone-100 font-semibold leading-relaxed" onComplete={() => { setIsTextComplete(true); setTimeout(() => setButtonsVisible(true), 300); }} />
            </div>
            <div className="z-20 flex justify-center flex-wrap gap-4 text-xl font-display font-bold mb-2 min-h-[2.5rem]">
              <AnimatePresence>
                {showStatChanges && Object.entries(showStatChanges).map(([stat, val]) => {
                  if (!val) return null;
                  const names: Record<string, string> = { compassion: 'Сострадание', courage: 'Смелость', wisdom: 'Мудрость', ambition: 'Амбиции', principle: 'Принципиальность' };
                  return (
                    <motion.span key={stat} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("px-3 py-1 rounded-lg text-lg font-bold drop-shadow-lg", val > 0 ? "bg-emerald-900/80 text-emerald-300" : "bg-red-900/80 text-red-300")}>
                      {names[stat] ?? stat} {val > 0 ? '+' : ''}{val}
                    </motion.span>
                  );
                })}
              </AnimatePresence>
            </div>
            <div className="z-10 flex flex-col gap-4 w-full max-w-2xl mt-auto pb-6">
              <AnimatePresence>
                {buttonsVisible && !showStatChanges && !isProcessingChoice && currentStepData.choices.map((choice, idx) => (
                  <motion.button key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: idx * 0.1 }} onClick={() => handleChoice(choice.statChanges, choice.nextStep, choice.isEnd, choice.endText)} className="group relative w-full overflow-hidden rounded-xl bg-stone-900/15 border border-stone-600/30 shadow-xl hover:scale-[1.02] hover:border-primary/60 transition-all duration-300">
                    <div className="relative z-10 px-6 py-4 flex flex-col items-center gap-2">
                      {choice.buttonImage && (
                        <div className="w-full h-40 overflow-hidden rounded-lg">
                          <img src={choice.buttonImage} alt="" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <span className="text-lg font-display text-stone-900 font-bold tracking-wide group-hover:text-amber-900 transition-colors text-center drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
                        {choice.label}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
            {questEndText && !questEndOverlay && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 bg-stone-950/90 flex flex-col items-center justify-center cursor-pointer px-8 md:px-16" onClick={handleQuestEndTextContinue}>
                <div className="w-full max-w-3xl bg-stone-900/95 rounded-xl p-8 border border-stone-600/50 shadow-2xl">
                  <TypewriterText text={questEndText} speed={30} className="text-lg md:text-xl font-sans text-stone-100 font-semibold leading-relaxed" onComplete={() => setIsQuestEndTextTyping(false)} />
                </div>
                {!isQuestEndTextTyping && (
                  <p className="mt-6 text-stone-500 text-sm font-display animate-pulse tracking-widest">
                    [ Пробел / Клик — продолжить ]
                  </p>
                )}
              </motion.div>
            )}
            {questEndOverlay && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 bg-cover bg-center flex flex-col items-center justify-center cursor-pointer" style={{ backgroundImage: "url('/images/bg-master.jpg')" }} onClick={handleQuestEndContinue}>
                <div className="absolute inset-0 bg-black/60 z-0" />
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="relative z-10 text-center px-8">
                  <h2 className="text-4xl md:text-5xl font-display text-primary mb-6 tracking-widest drop-shadow-lg">✦ Испытание завершено ✦</h2>
                  <p className="text-stone-300 font-sans text-lg md:text-xl font-semibold mb-8 leading-relaxed">Твои характеристики обновлены.</p>
                  <p className="text-stone-500 text-sm font-display animate-pulse tracking-widest">[ Пробел / Клик — продолжить ]</p>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}

        {gameState === 'FINAL' && (
          <motion.div key="final" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-cover bg-center flex flex-col items-center justify-end cursor-pointer" style={{ backgroundImage: "url('/images/bg-master.jpg')" }} onClick={handleFinalNext}>
            <div className="absolute inset-0 bg-black/55 z-0" />
            <img src="/images/master.gif" alt="Профессор" className="absolute bottom-28 left-1/2 -translate-x-1/2 h-[65vh] w-auto object-contain z-10 drop-shadow-[0_0_40px_rgba(212,175,55,0.4)] pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-stone-950/92 border-t-2 border-primary/30 px-8 py-6 h-[160px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div key={finalStep} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <TypewriterText text={MASTER_FINAL_DIALOGS[finalStep]} speed={35} className="text-xl md:text-2xl font-sans text-stone-100 font-semibold leading-relaxed" onComplete={() => setIsFinalTyping(false)} />
                </motion.div>
              </AnimatePresence>
              {!isFinalTyping && (
                <div className="text-right mt-3 text-primary/70 text-xs font-display tracking-widest animate-pulse">
                  [ Пробел / Enter / Клик — далее ]
                </div>
              )}
            </div>
          </motion.div>
        )}

        {gameState === 'FINAL_YES' && (
          <motion.div key="final-yes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-cover bg-center flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto" style={{ backgroundImage: "url('/images/bg-dark.jpg')" }}>
            <div className="absolute inset-0 bg-black/70 z-0" />
            <div className="z-10 w-full max-w-3xl flex flex-col items-center gap-8">
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center">
                <p className="text-stone-400 font-display uppercase tracking-widest text-sm mb-2">Твой архетип</p>
                <h1 className="text-5xl md:text-6xl font-display text-primary font-bold tracking-widest drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]">{archetype}</h1>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="w-full bg-stone-950/85 border-2 border-primary/30 rounded-xl p-8 shadow-2xl backdrop-blur-sm">
                {isLoadingAiText ? (
                  <div className="flex items-center justify-center gap-3 text-stone-400 py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="font-display text-sm tracking-widest">Мастер читает судьбу...</span>
                  </div>
                ) : (
                  <TypewriterText text={archetypeAiText} speed={32} className="text-lg md:text-xl font-sans text-stone-100 font-medium leading-relaxed text-center" onComplete={() => {}} />
                )}
              </motion.div>
              {!isLoadingAiText && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="flex flex-col sm:flex-row gap-4 mt-4">
                  <button onClick={() => { audioManager.playClick(); setIsExamCardOpen(true); }} className="px-6 py-3 bg-stone-800/80 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-600 font-display tracking-widest transition-colors text-sm">Экзаменационная карта</button>
                  <button onClick={async () => { audioManager.playClick(); await resetQuests.mutateAsync({ playerId: player.playerId }); await refetch(); setPendingStats({}); setMasterStep(0); setIsMasterTyping(true); setArchetypeAiText(''); setGameState('PORTALS'); }} className="px-6 py-3 bg-stone-800/80 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-600 font-display tracking-widest transition-colors text-sm">Пройти испытания снова</button>
                  <button onClick={() => { audioManager.playClick(); handleLogout(); }} className="px-6 py-3 bg-red-900/60 hover:bg-red-800 text-red-300 rounded-lg border border-red-800 font-display tracking-widest transition-colors text-sm">Выйти из игры</button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
