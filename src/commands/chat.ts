import { LichobiCommand } from "#lichobi/framework";
import { AIService, AIMessage } from "#root/utils/index.js";
import {
  Message,
  ChannelType,
  TextChannel,
  DMChannel,
  NewsChannel,
} from "discord.js";

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

  async handleLegacyMessage(message: Message, commandArgString: string) {
    const userMessage = commandArgString;
    const { channel, channelId } = message;
    if (!channel.isSendable()) {
      this.bot.logger.error(
        `chat used in non-sendable channel (id: ${channelId})`,
      );
      return;
    }

    try {
      await channel.sendTyping();
      const response = await this.generateChatResponse(
        message.channel,
        userMessage,
        message.author.displayName,
      );

      // Send a normal message reply instead of an embed
      await message.reply(response);
    } catch (error) {
      this.bot.logger.error("Error in chat command:", error);

      // Send a simple error message
      await message.reply(
        "Woof! Something went wrong while I was thinking. Can you try again? 🐕",
      );
    }
  }

  private async generateChatResponse(
    channel: Message["channel"],
    userMessage: string,
    userName: string,
  ): Promise<string> {
    const aiService = AIService.getInstance();

    // Build the messages array starting with system prompt
    const messages: AIMessage[] = [
      {
        role: "system",
        content: this.DOG_SYSTEM_PROMPT,
      },
    ];

    // Add recent channel context if it's a text-based channel
    if (this.isTextBasedChannel(channel)) {
      try {
        const recentMessages = await this.getRecentMessages(channel);
        messages.push(...recentMessages);
      } catch (error) {
        console.warn("Could not fetch recent messages for context:", error);
      }
    }

    // Add the current user message
    messages.push({
      role: "user",
      content: `${userName}: ${userMessage}`,
    });

    const response = await aiService.generateResponse(messages);
    return response.content;
  }

  private async getRecentMessages(
    channel: TextChannel | DMChannel | NewsChannel | ThreadChannel,
  ): Promise<AIMessage[]> {
    try {
      // Fetch the last 10 messages (excluding the current one)
      const messages = await channel.messages.fetch({ limit: 10 });
      const contextMessages: AIMessage[] = [];

      // Convert Discord messages to AI messages, in chronological order
      const sortedMessages = Array.from(messages.values()).sort(
        (a, b) => a.createdTimestamp - b.createdTimestamp,
      );

      for (const msg of sortedMessages) {
        // Skip bot messages and system messages
        if (msg.author.bot || msg.system) continue;

        // Skip messages that are just commands
        if (msg.content.startsWith("!") || msg.content.startsWith("/"))
          continue;

        // Only include messages with actual content
        if (msg.content.trim().length === 0) continue;

        contextMessages.push({
          role: "user",
          content: `${msg.author.displayName}: ${msg.content}`,
        });
      }

      return contextMessages;
    } catch (error) {
      console.warn("Error fetching recent messages:", error);
      return [];
    }
  }

  private isTextBasedChannel(
    channel: Message["channel"],
  ): channel is TextChannel | DMChannel | NewsChannel | ThreadChannel {
    if (!channel) return false;

    return (
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.DM ||
      channel.type === ChannelType.GuildNews ||
      channel.type === ChannelType.PublicThread ||
      channel.type === ChannelType.PrivateThread ||
      channel.type === ChannelType.AnnouncementThread
    );
  }
}
