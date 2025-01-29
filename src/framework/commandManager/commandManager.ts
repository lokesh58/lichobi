import { ApplicationCommandType, Events, Message } from "discord.js";
import { Bot } from "../bot.js";
import { CommandRegistry } from "./commandRegistry.js";
import {
  LichobiError,
  UnknownCommandError,
  UserDisplayableError,
} from "../errors.js";

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
      const { commandName, commandId } = interaction;
      try {
        const command = this.commands.get(commandName);
        if (!command) {
          throw new LichobiError(
            `Command with name '${commandName}' not found.`,
          );
        }

        if (interaction.isChatInputCommand()) {
          if (!command.hasChatInputMixin()) {
            throw new UnknownCommandError(
              commandId,
              commandName,
              ApplicationCommandType.ChatInput,
            );
          }
          await command.handleChatInput(interaction);
        }

        if (interaction.isMessageContextMenuCommand()) {
          if (!command.hasMessageContextMenuMixin()) {
            throw new UnknownCommandError(
              commandId,
              commandName,
              ApplicationCommandType.Message,
            );
          }
          await command.handleMessageContext(interaction);
        }

        if (interaction.isUserContextMenuCommand()) {
          if (!command.hasUserContextMenuMixin()) {
            throw new UnknownCommandError(
              commandId,
              commandName,
              ApplicationCommandType.User,
            );
          }
          await command.handleUserContext(interaction);
        }
      } catch (error) {
        this.bot.logger.error(
          `An error occurred while handling command '${commandName}'.`,
          error,
        );
        if (interaction.deferred || interaction.replied) {
          await interaction
            .followUp({
              content:
                error instanceof UserDisplayableError
                  ? error.message
                  : "An unexpected error occurred. Please try again later.",
              ephemeral: true,
            })
            .catch((reason) => this.bot.logger.error(reason));
        } else {
          await interaction
            .reply({
              content:
                error instanceof UserDisplayableError
                  ? error.message
                  : "An unexpected error occurred. Please try again later.",
              ephemeral: true,
            })
            .catch((reason) => this.bot.logger.error(reason));
        }
      }
    });
  }

  private startLegacyMessageCommandHandler(): void {
    this.bot.client.on(Events.MessageCreate, async (message) => {
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
        await message.reply(
          error instanceof UserDisplayableError
            ? error.message
            : "An unexpected error occurred. Please try again later.",
        );
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
