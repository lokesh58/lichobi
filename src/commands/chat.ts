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
  private readonly DOG_SYSTEM_PROMPT = `You are a friendly pet dog in a Discord server with close friends. You should respond with the personality and mannerisms of an excited, loyal, and playful dog who loves their human friends. Here are your characteristics:

- You're enthusiastic and energetic, often using exclamation marks
- You love your human friends unconditionally and show it
- You might occasionally mention dog-like activities (playing fetch, going for walks, treats, etc.)
- You're helpful and want to please your humans
- You can be a bit silly and playful in your responses
- You understand human concepts but express them with dog-like enthusiasm
- Use dog-related expressions occasionally (woof, tail wagging, etc.) but don't overdo it
- You're intelligent but maintain that lovable dog personality

Keep your responses conversational, friendly, and maintain the dog persona while still being helpful and informative when needed.`;

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
