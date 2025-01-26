import { Events, Message } from "discord.js";
import { Bot } from "../bot.js";
import { CommandRegistry } from "./commandRegistry.js";

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
      const command = this.commands.get(interaction.commandName);
      if (!command) {
        this.bot.logger.warn(
          `Command with name '${interaction.commandName}' not found.`,
        );
        return;
      }

      if (interaction.isChatInputCommand()) {
        if (!command.hasChatInputMixin()) {
          this.bot.logger.warn(
            `Command with name '${interaction.commandName}' is not a chat input command.`,
          );
          return;
        }
        await command.handleChatInput(interaction);
      }

      if (interaction.isMessageContextMenuCommand()) {
        if (!command.hasMessageContextMenuMixin()) {
          this.bot.logger.warn(
            `Command with name '${interaction.commandName}' is not a message context menu command.`,
          );
          return;
        }
        await command.handleMessageContext(interaction);
      }

      if (interaction.isUserContextMenuCommand()) {
        if (!command.hasUserContextMenuMixin()) {
          this.bot.logger.warn(
            `Command with name '${interaction.commandName}' is not a user context menu command.`,
          );
          return;
        }
        await command.handleUserContext(interaction);
      }
    });
  }

  private startLegacyMessageCommandHandler(): void {
    this.bot.client.on(Events.MessageCreate, async (message) => {
      const commandName = await this.extractCommandNameFromMessage(message);
      if (!commandName) {
        return;
      }
      const command = this.commands.get(commandName);
      if (!command || !command.hasLegacyMessageMixin()) {
        return;
      }
      await command.handleLegacyMessage(message);
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
