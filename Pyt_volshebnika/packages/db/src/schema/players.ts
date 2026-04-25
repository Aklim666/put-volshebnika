import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  avatar: text("avatar").notNull().default("cat"),
  compassion: integer("compassion").notNull().default(0),
  courage: integer("courage").notNull().default(0),
  wisdom: integer("wisdom").notNull().default(0),
  ambition: integer("ambition").notNull().default(0),
  principle: integer("principle").notNull().default(0),
  completedQuests: text("completed_quests").notNull().default("[]"),
  archetypeEarned: text("archetype_earned"),
  previousArchetypes: text("previous_archetypes").notNull().default("[]"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
