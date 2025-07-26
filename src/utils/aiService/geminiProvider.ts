import { GoogleGenAI } from "@google/genai";
import { AIMessage, AIProvider, AIResponse } from "./aiService.js";
import { UserDisplayableError } from "#lichobi/framework";

export class GeminiProvider extends AIProvider {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    super();
    this.ai = new GoogleGenAI({ apiKey });
  }

  public async generateResponse(messages: AIMessage[]): Promise<AIResponse> {
    try {
      // Convert messages to Gemini format
      const contents = this.convertMessages(messages);

      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents,
      });

      const usage: { inputTokens?: number; outputTokens?: number } = {};
      if (response.usageMetadata?.promptTokenCount !== undefined) {
        usage.inputTokens = response.usageMetadata.promptTokenCount;
      }
      if (response.usageMetadata?.candidatesTokenCount !== undefined) {
        usage.outputTokens = response.usageMetadata.candidatesTokenCount;
      }

      return {
        content: response.text || "",
        usage: Object.keys(usage).length > 0 ? usage : undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("API_KEY_INVALID") ||
          error.message.includes("Invalid API key")
        ) {
          throw new UserDisplayableError("Invalid AI API key configuration.");
        }
        if (error.message.includes("QUOTA_EXCEEDED")) {
          throw new UserDisplayableError(
            "AI service quota exceeded. Please try again later.",
          );
        }
        if (error.message.includes("RATE_LIMIT_EXCEEDED")) {
          throw new UserDisplayableError(
            "AI service rate limit exceeded. Please try again later.",
          );
        }
      }
      throw new UserDisplayableError(
        "AI service is currently unavailable. Please try again later.",
      );
    }
  }

  private convertMessages(messages: AIMessage[]): string {
    // For Gemini, we'll combine all messages into a single prompt
    // System messages become instructions, user/assistant messages become conversation
    let prompt = "";

    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    if (systemMessages.length > 0) {
      prompt += systemMessages.map((m) => m.content).join("\n\n") + "\n\n";
    }

    if (conversationMessages.length > 0) {
      prompt += conversationMessages
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n\n");
    }

    return prompt;
  }
}
