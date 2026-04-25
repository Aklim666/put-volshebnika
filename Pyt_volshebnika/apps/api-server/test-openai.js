import "dotenv/config";
import { openai } from "@wizard-path/integrations-openai-ai-server";

console.log("OPENAI_API_KEY загружен:", process.env.OPENAI_API_KEY ? "ДА" : "НЕТ");
console.log("Длина ключа:", process.env.OPENAI_API_KEY?.length || 0);

try {
  console.log("Отправка запроса к OpenAI...");
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 50,
    temperature: 0.7,
    messages: [
      { role: "user", content: "Скажи просто 'Привет, тест работает!'" }
    ],
  });
  console.log("Ответ OpenAI:", response.choices[0]?.message?.content);
} catch (err) {
  console.error("Ошибка OpenAI:", err.message);
  console.error("Status:", err.status);
  console.error("Code:", err.code);
}
