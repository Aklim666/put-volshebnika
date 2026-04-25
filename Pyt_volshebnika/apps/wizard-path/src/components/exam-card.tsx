import { X, Volume2, VolumeX, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdatePlayerAvatar, type PlayerProfile } from '@wizard-path/api-client-react';
import { useState, useEffect } from 'react';
import { audioManager } from '@/lib/audio';
import { cn } from '@/lib/utils';

interface ExamCardProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile | undefined;
  onLogout: () => void;
}

function StatBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.max(0, Math.min(100, ((value + 5) / 20) * 100));
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1 font-display font-bold text-stone-950">
        <span>{label}</span>
        <span className={cn(value < 0 ? "text-red-700" : "text-amber-800")}>{value}</span>
      </div>
      <div className="h-3 w-full bg-stone-400/60 rounded-full overflow-hidden border border-stone-600/40">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            value < 0
              ? "bg-gradient-to-r from-red-700 to-red-500"
              : "bg-gradient-to-r from-amber-700 to-yellow-500"
          )}
        />
      </div>
    </div>
  );
}

export function ExamCard({ isOpen, onClose, player, onLogout }: ExamCardProps) {
  const [isMuted, setIsMuted] = useState(audioManager.getMuted());
  const [localAvatar, setLocalAvatar] = useState<string>(player?.avatar ?? 'cat');
  const updateAvatar = useUpdatePlayerAvatar();

  useEffect(() => {
    if (player) setLocalAvatar(player.avatar);
  }, [player?.avatar]);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioManager.setMuted(newMuted);
    audioManager.playClick();
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!player) return;
    audioManager.playClick();
    const newAvatar = localAvatar === 'cat' ? 'frog' : 'cat';
    setLocalAvatar(newAvatar);
    updateAvatar.mutate({
      playerId: player.playerId,
      data: { avatar: newAvatar }
    });
  };

  const getAvatarSrc = (avatar: string) => {
    if (avatar === 'frog') return '/images/avatar-frog.jpg';
    return '/images/avatar-cat.jpg';
  };

  return (
    <AnimatePresence>
      {isOpen && player && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[url('/images/bg-parchment.jpg')] bg-cover bg-center rounded-xl overflow-hidden shadow-2xl border-2 border-amber-800/60"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-amber-50/70 pointer-events-none" />

            <div className="relative p-6 sm:p-8">
              {/* Header row with title + close button */}
              <div className="flex items-center justify-between mb-6 border-b-2 border-stone-800/30 pb-4">
                <h2 className="text-2xl font-display text-stone-900 uppercase tracking-widest font-bold">
                  Экзаменационная Карта
                </h2>
                <button
                  onClick={onClose}
                  className="ml-3 flex-shrink-0 p-1.5 bg-stone-800/10 hover:bg-stone-800/20 rounded-full text-stone-700 hover:text-stone-950 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center mb-6">
                <div
                  className="relative w-36 h-36 cursor-pointer group"
                  onClick={handleAvatarClick}
                >
                  <img
                    src={getAvatarSrc(localAvatar)}
                    alt="Аватар"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <span className="text-white text-xs font-bold uppercase tracking-widest">Сменить</span>
                  </div>
                </div>
                <h3 className="mt-3 text-xl font-display font-bold text-stone-900">{player.name}</h3>
                <p className="text-stone-700 italic font-semibold text-sm">Студент Башни</p>
              </div>

              <div className="mb-6 bg-stone-200/60 p-4 rounded-lg border border-stone-400/40">
                <StatBar label="Сострадание" value={player.compassion} />
                <StatBar label="Смелость" value={player.courage} />
                <StatBar label="Мудрость" value={player.wisdom} />
                <StatBar label="Амбиция" value={player.ambition} />
                <StatBar label="Принципиальность" value={player.principle} />
              </div>

              {player.previousArchetypes && player.previousArchetypes.length > 0 && (
                <div className="mb-5 bg-amber-100/70 p-3 rounded-lg border border-amber-600/40">
                  <p className="text-xs font-display font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Ранее полученные архетипы:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {player.previousArchetypes.map((arch, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-stone-800/80 text-amber-300 text-xs font-display font-bold rounded-full border border-amber-700/40"
                      >
                        {arch}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-stone-700/20 pt-4">
                <button
                  onClick={toggleMute}
                  className="flex items-center gap-2 px-3 py-2 bg-stone-800 text-stone-200 rounded-md hover:bg-stone-700 transition-colors font-display text-xs font-bold tracking-wide"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  {isMuted ? "Включить звук" : "Выключить звук"}
                </button>

                <button
                  onClick={() => { audioManager.playClick(); onLogout(); }}
                  className="flex items-center gap-2 px-3 py-2 bg-red-800 text-white border border-red-900 rounded-md hover:bg-red-700 transition-colors font-display text-xs font-bold tracking-wide"
                >
                  <LogOut className="w-4 h-4" />
                  Покинуть Башню
                </button>
              </div>
            </div>

            <div className="bg-stone-900 text-stone-400 p-3 text-center text-xs">
              Об ошибках и предложениях писать сюда:{' '}
              <a href="mailto:mil.sol.05@mail.ru" className="text-amber-400 hover:underline">mil.sol.05@mail.ru</a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
