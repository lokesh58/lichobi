import { LichobiError } from "#lichobi/framework";
import config from "#root/config.js";
import { AIMessage, AIProvider, AIResponse } from "./base.js";
import { GeminiProvider } from "./geminiProvider.js";

export class AIService {
  private static _instance: AIService | undefined;
  private provider: AIProvider;

  private constructor(provider: AIProvider) {
    this.provider = provider;
  }

  public static getInstance(): AIService {
    if (!this._instance) {
      const provider = this.createProvider();
      this._instance = new AIService(provider);
    }
    return this._instance;
  }

  private static createProvider(): AIProvider {
    const { aiProvider } = config;
    switch (aiProvider) {
      case "gemini":
        return new GeminiProvider(config.aiApiKey);
      default:
        aiProvider satisfies never;
        throw new LichobiError(`Unsupported AI provider: ${aiProvider}`);
    }
  }

  public async generateResponse(messages: AIMessage[]): Promise<AIResponse> {
    return this.provider.generateResponse(messages);
  }
}
