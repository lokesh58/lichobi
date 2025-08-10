import { Message } from "discord.js";
import { ChatParticipant } from "../framework/chatParticipant/base.js";
import { AIService, AIMessage, LocalCache } from "../utils/index.js";

export class DogChatParticipant extends ChatParticipant({
  name: "dog-chat",
  description:
    "A helpful assistant with a subtle dog personality for chat conversations",
  priority: 100,
}) {
  private conversationContext = new LocalCache<{
    userId: string;
    lastInteraction: number;
  }>({
    ttlSeconds: 60,
    cleanupIntervalSeconds: 30,
  });

  public async shouldRespond(message: Message): Promise<boolean> {
    if (
      [
        // bot is mentioned/tagged
        message.mentions.has(this.bot.client.user),

        // in DMs
        message.channel.isDMBased(),

        // in an active conversation with this user in this channel
        this.isInActiveConversation(message),

        // is a reply to the bot's message
        await this.isReplyToBotMessage(message),
      ].some((v) => v)
    ) {
      this.updateConversationContext(message);
      return true;
    }

    return false;
  }

  private updateConversationContext(message: Message): void {
    const key = message.channel.id;
    this.conversationContext.set(key, {
      userId: message.author.id,
      lastInteraction: Date.now(),
    });
  }

  private isInActiveConversation(message: Message): boolean {
    const context = this.conversationContext.get(message.channel.id);
    return context?.userId === message.author.id;
  }

  private async isReplyToBotMessage(message: Message): Promise<boolean> {
    if (!message.reference?.messageId) return false;

    try {
      const repliedMessage = await message.channel.messages.fetch(
        message.reference.messageId,
      );
      return repliedMessage.author.id === this.bot.client.user.id;
    } catch {
      return false;
    }
  }

  public async getResponse(message: Message): Promise<string> {
    const aiService = AIService.getInstance();

    // Build the messages array starting with system prompt
    const messages: AIMessage[] = [
      {
        role: "system",
        content: `You are a helpful Discord bot with a subtle dog personality. You are operating as a bot on Discord with the user ID ${this.bot.client.user.id} and tag ${this.bot.client.user.tag}. Keep your responses concise and to the point while occasionally including light dog puns or references. Here are your characteristics:

- Keep responses short and direct (MUST be under 1900 characters)
- Be helpful and informative first, playful second
- Use occasional dog puns naturally (but don't force them)
- Maintain a friendly but not overly excited tone
- Only mention dog activities when relevant to the conversation
- Be intelligent and helpful while keeping the subtle dog charm
- Remember you are a Discord bot responding to messages in channels or DMs

Focus on being useful while adding just a touch of dog personality through clever wordplay when appropriate. IMPORTANT: Keep all responses under 1900 characters to fit Discord's message limits.`,
      },
    ];

    const recentMessages = await this.getRecentMessages(message.channel);
    messages.push(...recentMessages);

    const response = await aiService.generateResponse(messages);
    return response.content;
  }

  private async getRecentMessages(
    channel: Message["channel"],
  ): Promise<AIMessage[]> {
    const messages = await channel.messages.fetch({ limit: 11 });
    const sortedMessages = Array.from(messages.values()).sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp,
    );
    return sortedMessages.map((msg) => ({
      role: "user",
      content: `${msg.author.displayName} (${msg.author.id}): ${msg.content}`,
    }));
  }
}
