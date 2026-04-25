import { fileURLToPath } from "node:url";
import path from "node:path";
import { config } from "dotenv";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env из корня проекта
config({ path: path.resolve(__dirname, "../../../.env") });

// Поддерживаем оба имени переменной для совместимости
const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

if (!apiKey) {
  throw new Error(
    "OPENAI_API_KEY must be set in .env file. " +
    "Get your key from https://platform.openai.com/api-keys"
  );
}

export const openai = new OpenAI({
  apiKey,
});
