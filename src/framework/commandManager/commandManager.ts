import { Events, Message } from "discord.js";
import { Bot } from "../bot.js";
import { CommandRegistry } from "./commandRegistry.js";
import { LichobiError, UserDisplayableError } from "../errors.js";

export type CommandManagerOptions = {
  commandsFolder: string;
};

export class CommandManager {
  private readonly bot: Bot<true>;
  public readonly commands: CommandRegistry;
  private readonly commandsFolder: string;

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
        const command = this.commands.get(interaction.commandName);
        if (!command) {
          throw new LichobiError(
            `Command with name '${interaction.commandName}' not found.`,
          );
        }

        if (interaction.isChatInputCommand()) {
          if (!command.hasChatInputMixin()) {
            throw new LichobiError(
              `Command with name '${interaction.commandName}' is not a chat input command.`,
            );
          }
          await command.handleChatInput(interaction);
        }

        if (interaction.isMessageContextMenuCommand()) {
          if (!command.hasMessageContextMenuMixin()) {
            throw new LichobiError(
              `Command with name '${interaction.commandName}' is not a message context menu command.`,
            );
          }
          await command.handleMessageContext(interaction);
        }

        if (interaction.isUserContextMenuCommand()) {
          if (!command.hasUserContextMenuMixin()) {
            throw new LichobiError(
              `Command with name '${interaction.commandName}' is not a user context menu command.`,
            );
          }
          await command.handleUserContext(interaction);
        }
      } catch (error) {
        this.bot.logger.error(
          `An error occurred while handling command '${interaction.commandName}'.`,
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
