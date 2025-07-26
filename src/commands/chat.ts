import {
  LichobiCommand,
  UserDisplayableError,
  UserInputError,
} from "#lichobi/framework";
import { AIService, AIMessage } from "#root/utils/index.js";
import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  Colors,
  ChannelType,
} from "discord.js";

type ChatCommandData = {
  options: readonly [
    {
      name: "query";
      description: "Your question or prompt for the AI";
      type: ApplicationCommandOptionType.String;
      required: true;
      maxLength: 2000;
    },
    {
      name: "context_messages";
      description: "Number of recent messages to include as context (1-100)";
      type: ApplicationCommandOptionType.Integer;
      required: false;
      minValue: 1;
      maxValue: 100;
    },
    {
      name: "include_usernames";
      description: "Include usernames in context messages";
      type: ApplicationCommandOptionType.Boolean;
      required: false;
    },
  ];
};

export class ChatCommand extends LichobiCommand(
  LichobiCommand.Base({
    name: "chat",
    description: "Chat with AI assistant with optional channel context",
  }),
  LichobiCommand.ChatInputCommandMixin<"cached", ChatCommandData>({
    options: [
      {
        name: "query",
        description: "Your question or prompt for the AI",
        type: ApplicationCommandOptionType.String,
        required: true,
        maxLength: 2000,
      },
      {
        name: "context_messages",
        description: "Number of recent messages to include as context (1-100)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
        minValue: 1,
        maxValue: 100,
      },
      {
        name: "include_usernames",
        description: "Include usernames in context messages",
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
    ],
  }),
  LichobiCommand.LegacyMessageCommandMixin(),
) {
  public override async handleChatInput(
    interaction: ChatInputCommandInteraction<"cached">,
  ): Promise<void> {
    const options = this.extractChatInputOptionsData(interaction);
    
    await interaction.deferReply();

    try {
      const messages = await this.buildMessages(
        interaction.channel!,
        options.query,
        options.context_messages || 0,
        options.include_usernames ?? true,
      );

      const aiService = AIService.getInstance();
      const response = await aiService.generateResponse(messages);

      const embed = this.buildResponseEmbed(
        options.query,
        response.content,
        options.context_messages || 0,
        response.usage,
      );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      if (error instanceof UserDisplayableError) {
        const errorEmbed = new EmbedBuilder()
          .setTitle("❌ Error")
          .setDescription(error.message)
          .setColor(Colors.Red);
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        throw error;
      }
    }
  }

  public override async handleLegacyMessage(message: Message): Promise<void> {
    const args = message.content.split(' ').slice(1);
    if (args.length === 0) {
      throw new UserInputError(
        "Please provide a query. Usage: `!chat <your question>`"
      );
    }

    const query = args.join(' ');
    let typing: Promise<void> | undefined;
    if ('sendTyping' in message.channel) {
      typing = message.channel.sendTyping();
    }

    try {
      const messages = await this.buildMessages(message.channel, query, 0, true);
      const aiService = AIService.getInstance();
      const response = await aiService.generateResponse(messages);

      await typing;
      const embed = this.buildResponseEmbed(query, response.content, 0, response.usage);
      await message.reply({ embeds: [embed] });
    } catch (error) {
      await typing;
      if (error instanceof UserDisplayableError) {
        const errorEmbed = new EmbedBuilder()
          .setTitle("❌ Error")
          .setDescription(error.message)
          .setColor(Colors.Red);
        await message.reply({ embeds: [errorEmbed] });
      } else {
        throw error;
      }
    }
  }

  private async buildMessages(
    channel: Message['channel'] | ChatInputCommandInteraction<'cached'>['channel'],
    query: string,
    contextCount: number,
    includeUsernames: boolean,
  ): Promise<AIMessage[]> {
    const messages: AIMessage[] = [];

    // Add system message
    messages.push({
      role: 'system',
      content: 'You are a helpful AI assistant in a Discord server. Provide concise, helpful responses.',
    });

    // Fetch context messages if requested
    if (contextCount > 0) {
      try {
        const contextMessages = await this.fetchContextMessages(
          channel,
          contextCount,
          includeUsernames,
        );
        
        if (contextMessages.length > 0) {
          messages.push({
            role: 'system',
            content: `Here are the ${contextMessages.length} most recent messages from this channel for context:\n\n${contextMessages}`,
          });
        }
      } catch (error) {
        // If we can't fetch context, continue without it
        console.warn('Failed to fetch context messages:', error);
      }
    }

    // Add user query
    messages.push({
      role: 'user',
      content: query,
    });

    return messages;
  }

  private async fetchContextMessages(
    channel: Message['channel'] | ChatInputCommandInteraction<'cached'>['channel'],
    count: number,
    includeUsernames: boolean,
  ): Promise<string> {
    // Check if we can read message history
    if (!channel || !channel.isTextBased() || channel.type === ChannelType.DM) {
      return '';
    }

    try {
      const messages = await channel.messages.fetch({ limit: count + 1 }); // +1 to exclude current message
      const contextMessages = Array.from(messages.values())
        .reverse() // Oldest first
        .slice(0, count) // Take only requested count
        .filter((msg): msg is Message<true> => msg instanceof Message && !msg.author.bot && msg.content.trim() !== '') // Filter out bots and empty messages
        .map(msg => this.sanitizeMessage(msg.content, msg.author.displayName, includeUsernames));

      return contextMessages.join('\n');
    } catch {
      // Permission error or other issue
      return '';
    }
  }

  private sanitizeMessage(content: string, username: string, includeUsername: boolean): string {
    // Remove mentions, clean up formatting
    let sanitized = content
      .replace(/<@!?\d+>/g, '@user') // Replace user mentions
      .replace(/<#\d+>/g, '#channel') // Replace channel mentions
      .replace(/<@&\d+>/g, '@role') // Replace role mentions
      .replace(/```[\s\S]*?```/g, '[code block]') // Replace code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code formatting
      .trim();

    // Truncate very long messages
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 197) + '...';
    }

    return includeUsername ? `${username}: ${sanitized}` : sanitized;
  }

  private buildResponseEmbed(
    query: string,
    response: string,
    contextCount: number,
    usage?: { inputTokens?: number; outputTokens?: number },
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle("🤖 AI Response")
      .setColor(Colors.Blue);

    // Truncate query for display
    const displayQuery = query.length > 100 ? query.substring(0, 97) + '...' : query;
    embed.addFields({ name: "Query", value: displayQuery, inline: false });

    // Truncate response if too long for Discord embed
    const maxResponseLength = 2000;
    const displayResponse = response.length > maxResponseLength 
      ? response.substring(0, maxResponseLength - 50) + '\n\n*[Response truncated]*'
      : response;

    embed.addFields({ name: "Response", value: displayResponse, inline: false });

    // Add context info if used
    if (contextCount > 0) {
      embed.setFooter({ text: `Used ${contextCount} messages as context` });
    }

    // Add usage info if available
    if (usage?.inputTokens || usage?.outputTokens) {
      const usageText = `Tokens: ${usage.inputTokens || 0} in, ${usage.outputTokens || 0} out`;
      const existingFooter = embed.data.footer?.text;
      embed.setFooter({ 
        text: existingFooter ? `${existingFooter} • ${usageText}` : usageText 
      });
    }

    return embed;
  }
}