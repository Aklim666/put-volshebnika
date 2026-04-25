import OpenAI from "openai";

function getEnvConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.ASSISTANT_ID;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || "300", 10);
  const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || "0.7");
  const timeout = parseInt(process.env.OPENAI_TIMEOUT || "30000", 10);

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY must be set in .env file");
  }

  if (!assistantId) {
    throw new Error("ASSISTANT_ID must be set in .env file");
  }

  return { apiKey, assistantId, model, maxTokens, temperature, timeout };
}

export interface ArchetypePredictionParams {
  archetype: string;
  compassion: number;
  courage: number;
  wisdom: number;
  ambition: number;
  principle: number;
}

export interface ArchetypePredictionResult {
  text: string;
  threadId: string;
  generationTime: number;
}

export interface RefinePredictionParams {
  threadId: string;
  feedback: string;
  originalContext?: {
    archetype: string;
    compassion: number;
    courage: number;
    wisdom: number;
    ambition: number;
    principle: number;
  };
}

class OpenAIAssistantClient {
  private client: OpenAI;
  private config: ReturnType<typeof getEnvConfig>;

  constructor() {
    this.config = getEnvConfig();
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
    });
  }

  private buildPrompt(params: ArchetypePredictionParams): string {
    const { archetype, compassion, courage, wisdom, ambition, principle } = params;

    return `Ты — Мастер Магической Академии, древний и мудрый наставник.
Твой студент только что прошёл испытания и получил архетип: "${archetype}".

Его характеристики:
- Сострадание: ${compassion}
- Смелость: ${courage}
- Мудрость: ${wisdom}
- Амбиции: ${ambition}
- Принципиальность: ${principle}

Произнеси торжественное предсказание судьбы студента (3-5 предложений).

ТРЕБОВАНИЯ:
1. Обращайся на "ты", лично к ученику
2. Используй мистический, возвышенный стиль (как древний оракул)
3. Включи метафоры: магия, судьба, путь, звёзды, тени, свет
4. Дай философское наставление или предупреждение
5. НЕ называй архетип прямо в тексте
6. НЕ используй современные слова
7. Говори по-русски`;
  }

  private buildRefinePrompt(params: RefinePredictionParams): string {
    const { feedback, originalContext } = params;

    if (!originalContext) {
      return `Уточнение к предыдущему предсказанию:
${feedback}

Перегенерируй предсказание с учётом этого уточнения.
Сохрани стиль и структуру (3-5 предложений, мистический тон, обращение на "ты").`;
    }

    return `Ты — Мастер Магической Академии.
Студент получил предсказание для архетипа "${originalContext.archetype}",
но хочет уточнить некоторые аспекты.

Оригинальные характеристики:
- Сострадание: ${originalContext.compassion}
- Смелость: ${originalContext.courage}
- Мудрость: ${originalContext.wisdom}
- Амбиции: ${originalContext.ambition}
- Принципиальность: ${originalContext.principle}

Уточнение от студента: ${feedback}

Перегенерируй предсказание с учётом уточнения.
Сохрани стиль (3-5 предложений, мистический тон, обращение на "ты").`;
  }

  private async waitForRunCompletion(
    threadId: string,
    runId: string
  ): Promise<OpenAI.Beta.Threads.Runs.Run> {
    const maxAttempts = 30;
    let attempt = 0;

    while (attempt < maxAttempts) {
      const run = await this.client.beta.threads.runs.retrieve(runId, { thread_id: threadId });

      if (run.status === "completed") {
        return run;
      }

      if (run.status === "failed" || run.status === "cancelled" || run.status === "expired") {
        throw new Error(`Run failed with status: ${run.status}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempt++;
    }

    throw new Error("Run timeout: ассистент не ответил за 30 секунд");
  }

  async generateArchetypePrediction(
    params: ArchetypePredictionParams
  ): Promise<ArchetypePredictionResult> {
    const startTime = Date.now();

    try {
      const thread = await this.client.beta.threads.create();
      const prompt = this.buildPrompt(params);

      await this.client.beta.threads.messages.create(thread.id, {
        role: "user",
        content: prompt,
      });

      const run = await this.client.beta.threads.runs.create(thread.id, {
        assistant_id: this.config.assistantId,
        model: this.config.model,
        max_completion_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      await this.waitForRunCompletion(thread.id, run.id);

      const messages = await this.client.beta.threads.messages.list(thread.id, {
        limit: 1,
      });

      const assistantMessage = messages.data.find((msg) => msg.role === "assistant");

      if (!assistantMessage || assistantMessage.content.length === 0) {
        throw new Error("Ассистент не вернул ответ");
      }

      const text = assistantMessage.content[0].type === "text"
        ? assistantMessage.content[0].text.value
        : "Твой путь уникален. Лишь время покажет, кем ты станешь.";

      return {
        text,
        threadId: thread.id,
        generationTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("OpenAI Assistant Error:", error);

      return {
        text: "Твой путь ведёт в неизвестное. Что бы ни ждало тебя впереди — ты справишься.",
        threadId: "",
        generationTime: Date.now() - startTime,
      };
    }
  }

  async refinePrediction(
    params: RefinePredictionParams
  ): Promise<ArchetypePredictionResult> {
    const startTime = Date.now();
    const { threadId, feedback, originalContext } = params;

    try {
      let actualThreadId = threadId;

      if (!actualThreadId) {
        const thread = await this.client.beta.threads.create();
        actualThreadId = thread.id;
      }

      const prompt = this.buildRefinePrompt(params);

      await this.client.beta.threads.messages.create(actualThreadId, {
        role: "user",
        content: prompt,
      });

      const run = await this.client.beta.threads.runs.create(actualThreadId, {
        assistant_id: this.config.assistantId,
        model: this.config.model,
        max_completion_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      await this.waitForRunCompletion(actualThreadId, run.id);

      const messages = await this.client.beta.threads.messages.list(actualThreadId, {
        limit: 1,
      });

      const assistantMessage = messages.data.find((msg) => msg.role === "assistant");

      if (!assistantMessage || assistantMessage.content.length === 0) {
        throw new Error("Ассистент не вернул ответ");
      }

      const text = assistantMessage.content[0].type === "text"
        ? assistantMessage.content[0].text.value
        : "Твой путь уникален. Лишь время покажет, кем ты станешь.";

      return {
        text,
        threadId: actualThreadId,
        generationTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("OpenAI Assistant Refine Error:", error);

      return {
        text: "Твой путь ведёт в неизвестное. Что бы ни ждало тебя впереди — ты справишься.",
        threadId: "",
        generationTime: Date.now() - startTime,
      };
    }
  }

  async chat(
    message: string,
    threadId?: string
  ): Promise<{ text: string; threadId: string }> {
    try {
      let actualThreadId = threadId;

      if (!actualThreadId) {
        const thread = await this.client.beta.threads.create();
        actualThreadId = thread.id;
      }

      await this.client.beta.threads.messages.create(actualThreadId, {
        role: "user",
        content: message,
      });

      const run = await this.client.beta.threads.runs.create(actualThreadId, {
        assistant_id: this.config.assistantId,
        model: this.config.model,
      });

      await this.waitForRunCompletion(actualThreadId, run.id);

      const messages = await this.client.beta.threads.messages.list(actualThreadId, {
        limit: 1,
      });

      const assistantMessage = messages.data.find((msg) => msg.role === "assistant");

      const text = assistantMessage?.content[0].type === "text"
        ? assistantMessage.content[0].text.value
        : "Магия молчит... Попробуй ещё раз.";

      return { text, threadId: actualThreadId };
    } catch (error) {
      console.error("OpenAI Assistant Chat Error:", error);
      return {
        text: "Магия молчит... Попробуй ещё раз.",
        threadId: "",
      };
    }
  }
}

export const assistantClient = new OpenAIAssistantClient();

export { OpenAIAssistantClient };

export async function generateArchetypePrediction(
  params: ArchetypePredictionParams
): Promise<string> {
  const result = await assistantClient.generateArchetypePrediction(params);
  return result.text;
}
