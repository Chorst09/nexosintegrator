import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY;

const googleAIPlugin = apiKey ? googleAI({ apiKey }) : googleAI();

export const ai = genkit({
  plugins: [googleAIPlugin],
  model: "googleai/gemini-2.5-flash"
});

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 3000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const lower = message.toLowerCase();
      const isQuotaError =
        lower.includes("resource_exhausted") ||
        lower.includes("quota") ||
        lower.includes("429");

      if (!isQuotaError || attempt === maxRetries - 1) {
        throw error;
      }

      const retryMatch = message.match(/retry in ([\d.]+)s/i);
      const waitMs = retryMatch
        ? Math.ceil(Number.parseFloat(retryMatch[1]) * 1000) + 500
        : baseDelayMs * Math.pow(2, attempt);

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError;
}
