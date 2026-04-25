export function calculateArchetype(compassion: number, courage: number, wisdom: number, ambition: number, principle: number): string {
  const scores: Record<string, number> = {};
  if (compassion >= 6 && courage >= 6 && wisdom >= 6 && ambition >= 6 && principle >= 6) scores["Наставник"] = 5;
  if (ambition >= 7 && compassion <= 3) scores["Мрак"] = 4;
  if (ambition >= 6 && compassion >= 5) scores["Властитель"] = 3;
  if (compassion >= 6 && courage <= 4) scores["Целитель"] = 2;
  if (principle >= 6 && compassion <= 4) scores["Борец за порядок"] = 1;
  const entries = Object.entries(scores);
  if (entries.length === 0) return "Искатель пути";
  if (entries.length >= 3) return "Искатель пути";
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export const ARCHETYPE_COLORS: Record<string, string> = {
  "Наставник": "from-amber-900/80 to-yellow-900/80",
  "Мрак": "from-purple-950/90 to-black/90",
  "Властитель": "from-indigo-900/80 to-blue-900/80",
  "Целитель": "from-emerald-900/80 to-teal-900/80",
  "Борец за порядок": "from-stone-800/80 to-stone-950/90",
  "Искатель пути": "from-sky-900/80 to-indigo-900/80",
};
