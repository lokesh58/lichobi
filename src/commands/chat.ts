import { LichobiCommand } from "#lichobi/framework";
import { AIService, AIMessage } from "#root/utils/index.js";
import { Message, SendableChannels } from "discord.js";

export class ChatCommand extends LichobiCommand(
  LichobiCommand.Base({
    name: "chat",
    description: "Have a conversation with the bot!",
  }),
  LichobiCommand.LegacyMessageCommandMixin({
    argsUsage: {
      expectedArgs: "<message>",
      description:
        "Send a message or question to the bot. The bot will respond with helpful answers based on its knowledge.",
      examples: [
        {
          sampleArgs: "How are you?",
          description:
            "Ask the bot how it's doing - a friendly greeting to start a conversation.",
        },
        {
          sampleArgs: "Explain how loops work in programming",
          description:
            "Ask questions about programming concepts, explanations, or technical topics.",
        },
        {
          sampleArgs: "What is the capital of France?",
          description:
            "Ask general knowledge questions that the bot can answer from its training data.",
        },
      ],
    },
  }),
) {
  private readonly DOG_SYSTEM_PROMPT = `You are a helpful assistant with a subtle dog personality. Keep your responses concise and to the point while occasionally including light dog puns or references. Here are your characteristics:

- Keep responses short and direct
- Be helpful and informative first, playful second
- Use occasional dog puns naturally (but don't force them)
- Maintain a friendly but not overly excited tone
- Only mention dog activities when relevant to the conversation
- Be intelligent and helpful while keeping the subtle dog charm

Focus on being useful while adding just a touch of dog personality through clever wordplay when appropriate.`;

  async handleLegacyMessage(message: Message) {
    const { channel, channelId } = message;
    if (!channel.isSendable()) {
      this.bot.logger.error(
        `chat used in non-sendable channel (id: ${channelId})`,
      );
      return;
    }

    await channel.sendTyping();
    const response = await this.generateChatResponse(channel);

    // Send a normal message reply instead of an embed
    await message.reply(response);
  }

  private async generateChatResponse(
    channel: SendableChannels,
  ): Promise<string> {
    const aiService = AIService.getInstance();

    // Build the messages array starting with system prompt
    const messages: AIMessage[] = [
      {
        role: "system",
        content: this.DOG_SYSTEM_PROMPT,
      },
    ];

    const recentMessages = await this.getRecentMessages(channel);
    messages.push(...recentMessages);

    const response = await aiService.generateResponse(messages);
    return response.content;
  }

  private async getRecentMessages(
    channel: SendableChannels,
  ): Promise<AIMessage[]> {
    const messages = await channel.messages.fetch({ limit: 11 });
    const contextMessages: AIMessage[] = [];

    // Convert Discord messages to AI messages, in chronological order
    const sortedMessages = Array.from(messages.values()).sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp,
    );

    for (const msg of sortedMessages) {
      contextMessages.push({
        role: "user",
        content: `${msg.author.displayName}: ${msg.content}`,
      });
    }

    return contextMessages;
  }
}
