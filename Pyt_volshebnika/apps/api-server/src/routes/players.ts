import { Router, type IRouter } from "express";
import { db, playersTable } from "@wizard-path/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function formatPlayer(player: typeof playersTable.$inferSelect) {
  return {
    playerId: player.id,
    name: player.name,
    avatar: player.avatar,
    compassion: player.compassion,
    courage: player.courage,
    wisdom: player.wisdom,
    ambition: player.ambition,
    principle: player.principle,
    completedQuests: JSON.parse(player.completedQuests || "[]") as number[],
    archetypeEarned: player.archetypeEarned ?? null,
    previousArchetypes: JSON.parse(player.previousArchetypes || "[]") as string[],
  };
}

router.post("/auth/register", async (req, res) => {
  const { name, password } = req.body as { name: string; password: string };
  if (!name || !password) {
    res.status(400).json({ message: "Имя и пароль обязательны" });
    return;
  }

  const existing = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.name, name));

  if (existing.length > 0) {
    res.status(409).json({ message: "Наверное вы что-то перепутали, этот студент уже сдал экзамен." });
    return;
  }

  const [player] = await db
    .insert(playersTable)
    .values({ name, password, avatar: "cat" })
    .returning();

  res.json(formatPlayer(player));
});

router.post("/auth/login", async (req, res) => {
  const { name, password } = req.body as { name: string; password: string };
  if (!name || !password) {
    res.status(400).json({ message: "Имя и пароль обязательны" });
    return;
  }

  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.name, name));

  if (!player) {
    res.status(404).json({ message: "Игрок не найден" });
    return;
  }

  if (player.password !== password) {
    res.status(401).json({ message: "Неверный пароль" });
    return;
  }

  res.json(formatPlayer(player));
});

router.get("/player/:playerId", async (req, res) => {
  const id = parseInt(req.params.playerId);
  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.id, id));

  if (!player) {
    res.status(404).json({ message: "Игрок не найден" });
    return;
  }

  res.json(formatPlayer(player));
});

router.put("/player/:playerId/stats", async (req, res) => {
  const id = parseInt(req.params.playerId);
  const {
    compassionDelta,
    courageDelta,
    wisdomDelta,
    ambitionDelta,
    principleDelta,
    questId,
    archetypeEarned,
  } = req.body as {
    compassionDelta: number;
    courageDelta: number;
    wisdomDelta: number;
    ambitionDelta: number;
    principleDelta: number;
    questId: number;
    archetypeEarned?: string | null;
  };

  const [current] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.id, id));

  if (!current) {
    res.status(404).json({ message: "Игрок не найден" });
    return;
  }

  const completedQuests = JSON.parse(current.completedQuests || "[]") as number[];
  if (questId > 0 && !completedQuests.includes(questId)) {
    completedQuests.push(questId);
  }

  const [updated] = await db
    .update(playersTable)
    .set({
      compassion: current.compassion + compassionDelta,
      courage: current.courage + courageDelta,
      wisdom: current.wisdom + wisdomDelta,
      ambition: current.ambition + ambitionDelta,
      principle: current.principle + principleDelta,
      completedQuests: JSON.stringify(completedQuests),
      archetypeEarned: archetypeEarned !== undefined ? archetypeEarned : current.archetypeEarned,
      updatedAt: new Date(),
    })
    .where(eq(playersTable.id, id))
    .returning();

  res.json(formatPlayer(updated));
});

router.put("/player/:playerId/avatar", async (req, res) => {
  const id = parseInt(req.params.playerId);
  const { avatar } = req.body as { avatar: string };

  const [updated] = await db
    .update(playersTable)
    .set({ avatar, updatedAt: new Date() })
    .where(eq(playersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ message: "Игрок не найден" });
    return;
  }

  res.json(formatPlayer(updated));
});

router.post("/player/:playerId/reset", async (req, res) => {
  const id = parseInt(req.params.playerId);

  const [current] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.id, id));

  if (!current) {
    res.status(404).json({ message: "Игрок не найден" });
    return;
  }

  const previousArchetypes = JSON.parse(current.previousArchetypes || "[]") as string[];
  if (current.archetypeEarned && !previousArchetypes.includes(current.archetypeEarned)) {
    previousArchetypes.push(current.archetypeEarned);
  }

  const [updated] = await db
    .update(playersTable)
    .set({
      compassion: 0,
      courage: 0,
      wisdom: 0,
      ambition: 0,
      principle: 0,
      completedQuests: "[]",
      archetypeEarned: null,
      previousArchetypes: JSON.stringify(previousArchetypes),
      updatedAt: new Date(),
    })
    .where(eq(playersTable.id, id))
    .returning();

  res.json(formatPlayer(updated));
});

export default router;
