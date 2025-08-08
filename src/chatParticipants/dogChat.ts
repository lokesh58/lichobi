import { Message, SendableChannels } from "discord.js";
import { ChatParticipant } from "../framework/chatParticipant/base.js";
import { AIService, AIMessage } from "../utils/index.js";

export class DogChatParticipant extends ChatParticipant({
  name: "dog-chat",
  description:
    "A helpful assistant with a subtle dog personality for chat conversations",
  priority: 100,
}) {
  private readonly DOG_SYSTEM_PROMPT = `You are a helpful assistant with a subtle dog personality. Keep your responses concise and to the point while occasionally including light dog puns or references. Here are your characteristics:

- Keep responses short and direct
- Be helpful and informative first, playful second
- Use occasional dog puns naturally (but don't force them)
- Maintain a friendly but not overly excited tone
- Only mention dog activities when relevant to the conversation
- Be intelligent and helpful while keeping the subtle dog charm

Focus on being useful while adding just a touch of dog personality through clever wordplay when appropriate.`;

  // Track active conversations: channelId -> { userId, lastInteraction }
  private conversationContext = new Map<string, { userId: string; lastInteraction: number }>();
  private readonly CONVERSATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  public async shouldRespond(message: Message): Promise<boolean> {
    // Always respond when the bot is mentioned/tagged
    if (message.mentions.has(this.bot.client.user)) {
      this.updateConversationContext(message);
      return true;
    }

    // Always respond in DMs
    if (message.channel.isDMBased()) {
      this.updateConversationContext(message);
      return true;
    }

    // Check if this is a reply to the bot's message
    if (await this.isReplyToBotMessage(message)) {
      this.updateConversationContext(message);
      return true;
    }

    // Check if we're in an active conversation with this user in this channel
    if (this.isInActiveConversation(message)) {
      this.updateConversationContext(message);
      return true;
    }

    return false;
  }

  private updateConversationContext(message: Message): void {
    const key = message.channel.id;
    this.conversationContext.set(key, {
      userId: message.author.id,
      lastInteraction: Date.now()
    });
  }

  private isInActiveConversation(message: Message): boolean {
    const context = this.conversationContext.get(message.channel.id);
    if (!context) return false;

    // Check if conversation has timed out
    if (Date.now() - context.lastInteraction > this.CONVERSATION_TIMEOUT) {
      this.conversationContext.delete(message.channel.id);
      return false;
    }

    // Check if it's the same user we were talking to
    return context.userId === message.author.id;
  }

  private async isReplyToBotMessage(message: Message): Promise<boolean> {
    if (!message.reference?.messageId) return false;

    try {
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      return repliedMessage.author.id === this.bot.client.user?.id;
    } catch {
      return false;
    }
  }

  public async getResponse(message: Message): Promise<string> {
    const response = await this.generateChatResponse(
      message.channel as SendableChannels,
    );
    return response;
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

