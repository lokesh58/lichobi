export type AIMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type AIResponse = {
  content: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export abstract class AIProvider {
  abstract generateResponse(messages: AIMessage[]): Promise<AIResponse>;
}
