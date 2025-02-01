import {
  APIEmbed,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Events,
  InteractionReplyOptions,
  Message,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
} from "discord.js";
import { Bot } from "../bot.js";
import { LichobiCommandType } from "../command/index.js";
import {
  LichobiError,
  UnexpectedError,
  UnknownCommandError,
} from "../errors.js";
import { CommandRegistry } from "./commandRegistry.js";

export type CommandManagerOptions = {
  commandsFolder: string;
};

export class CommandManager {
  private readonly bot: Bot<true>;
  private readonly commandsFolder: string;
  public readonly commands: CommandRegistry;

  constructor(bot: Bot<true>, options: CommandManagerOptions) {
    this.bot = bot;
    this.commands = new CommandRegistry(bot);
    this.commandsFolder = options.commandsFolder;
  }

  public async init(): Promise<void> {
    await this.commands.loadFromFolder(this.commandsFolder);
  }

  public startCommandHandlers(): void {
    this.startInteractionCommandHandler();
    this.startLegacyMessageCommandHandler();
  }

  private startInteractionCommandHandler(): void {
    this.bot.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isCommand()) {
        return;
      }
      try {
        if (interaction.isChatInputCommand()) {
          await this.handleChatInputInteraction(interaction);
        } else if (interaction.isMessageContextMenuCommand()) {
          await this.handleMessageContextMenuInteraction(interaction);
        } else if (interaction.isUserContextMenuCommand()) {
          await this.handleUserContextMenuInteraction(interaction);
        }
      } catch (error) {
        this.bot.logger.error(
          `An error occurred while handling command '${interaction.commandName}'.`,
          error,
        );
        const response: InteractionReplyOptions = {
          embeds: [this.generateErrorEmbed(error)],
          ephemeral: true,
        };
        if (interaction.deferred || interaction.replied) {
          await interaction
            .followUp(response)
            .catch((reason) => this.bot.logger.error(reason));
        } else {
          await interaction
            .reply(response)
            .catch((reason) => this.bot.logger.error(reason));
        }
      }
    });
  }

  private async handleChatInputInteraction(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const { commandId, commandName } = interaction;
    const command = this.commands.get(commandName);
    if (!command || !command.hasChatInputMixin()) {
      throw new UnknownCommandError(
        commandId,
        commandName,
        LichobiCommandType.ChatInput,
      );
    }
    await command.handleChatInput(interaction);
  }

  private async handleMessageContextMenuInteraction(
    interaction: MessageContextMenuCommandInteraction,
  ): Promise<void> {
    const { commandId, commandName } = interaction;
    const command = this.commands.get(commandName);
    if (!command || !command.hasMessageContextMenuMixin()) {
      throw new UnknownCommandError(
        commandId,
        commandName,
        LichobiCommandType.MessageContextMenu,
      );
    }
    await command.handleMessageContext(interaction);
  }

  private async handleUserContextMenuInteraction(
    interaction: UserContextMenuCommandInteraction,
  ): Promise<void> {
    const { commandId, commandName } = interaction;
    const command = this.commands.get(commandName);
    if (!command || !command.hasUserContextMenuMixin()) {
      throw new UnknownCommandError(
        commandId,
        commandName,
        LichobiCommandType.UserContextMenu,
      );
    }
    await command.handleUserContext(interaction);
  }

  private generateErrorEmbed(rawError: unknown): APIEmbed {
    const error =
      rawError instanceof LichobiError
        ? rawError
        : new UnexpectedError(rawError);
    return new EmbedBuilder()
      .setDescription(error.displayMessage())
      .setColor("Red")
      .toJSON();
  }

  private startLegacyMessageCommandHandler(): void {
    this.bot.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) {
        return;
      }
      try {
        const commandName = await this.extractCommandNameFromMessage(message);
        if (!commandName) {
          return;
        }
        const command = this.commands.get(commandName);
        if (!command || !command.hasLegacyMessageMixin()) {
          return;
        }
        await command.handleLegacyMessage(message);
      } catch (error) {
        this.bot.logger.error(
          `An error occurred while handling command '${message.content}'.`,
          error,
        );
        await message.reply({
          embeds: [this.generateErrorEmbed(error)],
        });
      }
    });
  }

  private async extractCommandNameFromMessage(
    message: Message,
  ): Promise<string | null> {
    const prefix = "!"; // This should be configurable
    if (!message.content.startsWith(prefix)) {
      return null;
    }
    return (
      message.content.substring(prefix.length).split(/\s+/)[0]?.toLowerCase() ||
      null
    );
  }
}
