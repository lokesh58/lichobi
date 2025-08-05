import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Events,
  MessageContextMenuCommandInteraction,
  Snowflake,
  UserContextMenuCommandInteraction,
} from "discord.js";
import { Bot } from "../bot.js";
import { LichobiCommandType } from "../command/index.js";
import {
  InvalidCommandError,
  LichobiError,
  UnknownCommandError,
} from "../errors.js";
import { LichobiEvent } from "../event/index.js";
import { ErrorUtility } from "../utils/index.js";
import { CommandRegistry } from "./commandRegistry.js";

export type CommandManagerOptions = {
  commandsFolder: string;
  devGuildId?: Snowflake | null;
};

export class CommandManager {
  private readonly bot: Bot<true>;
  private readonly commandsFolder: string;
  public readonly commands: CommandRegistry;
  private readonly devGuildId?: Snowflake;

  constructor(bot: Bot<true>, options: CommandManagerOptions) {
    this.bot = bot;
    this.commands = new CommandRegistry(bot);
    this.commandsFolder = options.commandsFolder;
    if (options.devGuildId) this.devGuildId = options.devGuildId;
  }

  public async loadCommands(): Promise<void> {
    await this.commands.loadFromFolder(this.commandsFolder);
  }

  public async registerCommandsOnDiscord(): Promise<void> {
    await this.commands.registerApplicationCommandsOnDiscord(this.devGuildId);
  }

  public startCommandHandlers(): void {
    this.startInteractionCommandHandler();
    this.startLegacyMessageCommandHandler();
  }

  private startInteractionCommandHandler(): void {
    this.bot.eventManager.registerEvent(
      LichobiEvent({
        name: "interaction-command-handler",
        event: Events.InteractionCreate,
        handler: async (interaction) => {
          if (!interaction.isCommand() && !interaction.isAutocomplete()) {
            return;
          }
          this.bot.logger.info(
            `${interaction.user} used command: ${interaction.commandName} (autocomplete: ${interaction.isAutocomplete()})`,
          );
          if (
            interaction.isChatInputCommand() ||
            interaction.isAutocomplete()
          ) {
            await this.handleChatInputInteraction(interaction);
          } else if (interaction.isMessageContextMenuCommand()) {
            await this.handleMessageContextMenuInteraction(interaction);
          } else if (interaction.isUserContextMenuCommand()) {
            await this.handleUserContextMenuInteraction(interaction);
          } else if (interaction.isPrimaryEntryPointCommand()) {
            throw new LichobiError(`Entry Point Command is not handled.`);
          } else {
            interaction satisfies never;
            throw new LichobiError(
              `Unhandled command interaction type: ${interaction["type"]}.`,
            );
          }
        },
      }),
    );
  }

  private async handleChatInputInteraction(
    interaction: ChatInputCommandInteraction | AutocompleteInteraction,
  ): Promise<void> {
    const { commandId, commandName } = interaction;
    const command = this.commands.get(
      commandName,
      LichobiCommandType.ChatInput,
    );
    if (!command) {
      throw new UnknownCommandError(
        commandId,
        commandName,
        LichobiCommandType.ChatInput,
      );
    }
    if (interaction.isChatInputCommand()) {
      await command.handleChatInput(interaction);
    } else {
      if (!command.handleAutocomplete) {
        throw new LichobiError(
          `Autocomplete requested but not available in ${commandName} (${commandId})`,
        );
      }
      await command.handleAutocomplete(interaction);
    }
  }

  private async handleMessageContextMenuInteraction(
    interaction: MessageContextMenuCommandInteraction,
  ): Promise<void> {
    const { commandId, commandName } = interaction;
    const command = this.commands.get(
      commandName,
      LichobiCommandType.MessageContextMenu,
    );
    if (!command) {
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
    const command = this.commands.get(
      commandName,
      LichobiCommandType.UserContextMenu,
    );
    if (!command) {
      throw new UnknownCommandError(
        commandId,
        commandName,
        LichobiCommandType.UserContextMenu,
      );
    }
    await command.handleUserContext(interaction);
  }

  private startLegacyMessageCommandHandler(): void {
    this.bot.eventManager.registerEvent(
      LichobiEvent({
        name: "legacy-message-command-handler",
        event: Events.MessageCreate,
        handler: async (message) => {
          if (message.author.bot) {
            return;
          }
          const prefix = await this.bot.prefixManager.getCommandPrefix(message);
          if (!message.content.startsWith(prefix)) {
            return;
          }
          this.bot.logger.info(
            `${message.author} sent a legacy message command.`,
          );
          const [commandName, argString] =
            this.extractCommandAndArgsFromMessage(
              message.content.substring(prefix.length),
            );
          this.bot.logger.info("Inferred command name:", commandName);
          const command = this.commands.get(
            commandName,
            LichobiCommandType.LegacyMessage,
          );
          if (!command) {
            throw new InvalidCommandError(commandName);
          }
          await command.handleLegacyMessage(message, argString);
        },
        customErrorHandler: async (error, [message]) => {
          this.bot.logger.error(
            `Error in legacy message command handler for message id: ${message.id}.`,
            error,
          );
          await message
            .reply({
              embeds: [ErrorUtility.generateErrorEmbed(error)],
            })
            .catch((reason) => this.bot.logger.error(reason));
        },
      }),
    );
  }

  private extractCommandAndArgsFromMessage(
    messageWithoutPrefix: string,
  ): [string, string] {
    const commandName = messageWithoutPrefix.split(/\s+/)[0].toLowerCase();
    const argString = messageWithoutPrefix
      .substring(commandName.length)
      .trimStart();
    return [commandName, argString];
  }
}
