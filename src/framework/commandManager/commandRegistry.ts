import { Bot, LichobiError } from "#lichobi/framework";
import {
  ApplicationCommandDataResolvable,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  Snowflake,
} from "discord.js";
import { readdirSync } from "fs";
import path from "path";
import {
  BaseCommand,
  isLichobiCommandConstructor,
  LichobiCommandType,
  LichobiCommandTypeToClassMap,
} from "../command/index.js";

export class CommandRegistry {
  private static readonly ValidExtensions = [".js", ".mjs", ".cjs", ".ts"];

  private readonly bot: Bot<true>;

  private readonly chatInputCommands = new Map<
    string,
    LichobiCommandTypeToClassMap["CHAT_INPUT"]
  >();
  private readonly legacyMessageCommands = new Map<
    string,
    LichobiCommandTypeToClassMap["LEGACY"]
  >();
  private readonly messageContextMenuCommands = new Map<
    string,
    LichobiCommandTypeToClassMap["MESSAGE"]
  >();
  private readonly userContextMenuCommands = new Map<
    string,
    LichobiCommandTypeToClassMap["USER"]
  >();

  constructor(bot: Bot<true>) {
    this.bot = bot;
  }

  public async register(command: BaseCommand): Promise<void> {
    if (command.hasChatInputMixin()) {
      this.registerCommandOfType(LichobiCommandType.ChatInput, command);
    }
    if (command.hasLegacyMessageMixin()) {
      this.registerCommandOfType(LichobiCommandType.LegacyMessage, command);
    }
    if (command.hasMessageContextMenuMixin()) {
      this.registerCommandOfType(
        LichobiCommandType.MessageContextMenu,
        command,
      );
    }
    if (command.hasUserContextMenuMixin()) {
      this.registerCommandOfType(LichobiCommandType.UserContextMenu, command);
    }
    await command.setup?.();
  }

  private registerCommandOfType<T extends LichobiCommandType>(
    commandType: T,
    command: LichobiCommandTypeToClassMap[T],
  ): void {
    const commandMap = this.getCommandMapForType(commandType);
    const commandName = command.getBaseCommandData().name.toLowerCase();
    if (commandMap.has(commandName)) {
      this.bot.logger.warn(
        `Command ${commandName} of type ${commandType} is already registered. Skipping registration.`,
      );
      return;
    }
    commandMap.set(commandName, command);
    this.bot.logger.info(
      `Registered command ${commandName} of type ${commandType}.`,
    );
  }

  private getCommandMapForType<T extends LichobiCommandType>(
    commandType: T,
  ): Map<string, LichobiCommandTypeToClassMap[T]> {
    switch (commandType) {
      case LichobiCommandType.ChatInput:
        return this.chatInputCommands as Map<
          string,
          LichobiCommandTypeToClassMap[T]
        >;
      case LichobiCommandType.LegacyMessage:
        return this.legacyMessageCommands as Map<
          string,
          LichobiCommandTypeToClassMap[T]
        >;
      case LichobiCommandType.MessageContextMenu:
        return this.messageContextMenuCommands as Map<
          string,
          LichobiCommandTypeToClassMap[T]
        >;
      case LichobiCommandType.UserContextMenu:
        return this.userContextMenuCommands as Map<
          string,
          LichobiCommandTypeToClassMap[T]
        >;
      default:
        commandType satisfies never;
        throw new LichobiError(`Unknown command type: ${commandType}`);
    }
  }

  public get<T extends LichobiCommandType>(
    name: string,
    type: T,
  ): LichobiCommandTypeToClassMap[T] | undefined {
    const commandMap = this.getCommandMapForType(type);
    return commandMap.get(name.toLowerCase());
  }

  public async loadFromFolder(folderPath: string): Promise<void> {
    await this.loadCommandsRecursively(folderPath);
  }

  private async loadCommandsRecursively(folderPath: string): Promise<void> {
    const items = readdirSync(folderPath, { withFileTypes: true });

    await Promise.all(
      items.map(async (item) => {
        const fullPath = path.join(folderPath, item.name);

        if (item.isDirectory()) {
          await this.loadCommandsRecursively(fullPath);
        } else if (
          item.isFile() &&
          CommandRegistry.ValidExtensions.includes(path.extname(item.name))
        ) {
          const commands = await this.importCommand(fullPath);
          await Promise.all(commands.map((command) => this.register(command)));
        }
      }),
    );
  }

  private async importCommand(filePath: string): Promise<BaseCommand[]> {
    this.bot.logger.debug(`Importing commands from ${filePath}`);
    try {
      // Convert to file URL for proper module resolution
      const importPath = `file://${filePath}`;
      const module = await import(importPath);

      if (!this.isValidModule(module)) {
        this.bot.logger.warn(
          `Skipping invalid module at ${filePath}. Expected a valid ES module, got ${typeof module}`,
        );
        return [];
      }

      const commands: BaseCommand[] = [];

      const potentialCommands = Object.values(module);
      for (const exportedValue of potentialCommands) {
        if (!isLichobiCommandConstructor(exportedValue)) {
          continue;
        }
        try {
          const command = new exportedValue(this.bot);
          commands.push(command);
        } catch (error) {
          this.bot.logger.error(
            `Failed to instantiate command from ${filePath}:`,
            error,
          );
        }
      }

      if (commands.length === 0) {
        this.bot.logger.warn(`No valid commands found in ${filePath}`);
        return [];
      }

      return commands;
    } catch (error) {
      this.bot.logger.error(`Error loading commands from ${filePath}:`, error);
      return [];
    }
  }

  private isValidModule(module: unknown): module is Record<string, unknown> {
    return (
      typeof module === "object" &&
      module !== null &&
      !Array.isArray(module) &&
      Object.entries(module as object).length > 0
    );
  }

  public async registerApplicationCommandsOnDiscord(
    guildId?: Snowflake,
  ): Promise<void> {
    const commands: ApplicationCommandDataResolvable[] = [];
    for (const command of this.chatInputCommands.values()) {
      commands.push(this.buildChatInputDiscordCommandData(command));
    }
    for (const command of this.messageContextMenuCommands.values()) {
      commands.push(this.buildMessageContextMenuDiscordCommandData(command));
    }
    for (const command of this.userContextMenuCommands.values()) {
      commands.push(this.buildUserContextMenuDiscordCommandData(command));
    }
    this.bot.logger.debug("Starting to register commands on Discord");
    if (guildId) {
      await this.bot.client.application.commands.set(commands, guildId);
    } else {
      await this.bot.client.application.commands.set(commands);
    }
    this.bot.logger.info("Successfully registered commands on Discord");
  }

  private buildChatInputDiscordCommandData(
    command: LichobiCommandTypeToClassMap["CHAT_INPUT"],
  ): ApplicationCommandDataResolvable {
    const commandData = {
      ...command.getBaseCommandData(),
      ...command.getAdditionalChatInputCommandData(),
    };
    const builder = new SlashCommandBuilder()
      .setName(commandData.name)
      .setDescription(commandData.description);
    commandData.options?.forEach((option) => {
      switch (option.type) {
        case ApplicationCommandOptionType.Number:
          builder.addNumberOption((o) => {
            o.setName(option.name)
              .setDescription(option.description)
              .setRequired(option.required ?? false)
              .setAutocomplete(option.autocomplete ?? false);
            if (option.minValue !== undefined) {
              o.setMinValue(option.minValue);
            }
            if (option.maxValue !== undefined) {
              o.setMaxValue(option.maxValue);
            }
            if (!option.autocomplete && option.choices) {
              o.setChoices(...option.choices);
            }
            return o;
          });
          break;
        case ApplicationCommandOptionType.Integer:
          builder.addIntegerOption((o) => {
            o.setName(option.name)
              .setDescription(option.description)
              .setRequired(option.required ?? false)
              .setAutocomplete(option.autocomplete ?? false);
            if (option.minValue !== undefined) {
              o.setMinValue(option.minValue);
            }
            if (option.maxValue !== undefined) {
              o.setMaxValue(option.maxValue);
            }
            if (!option.autocomplete && option.choices) {
              o.setChoices(...option.choices);
            }
            return o;
          });
          break;
        case ApplicationCommandOptionType.String:
          builder.addStringOption((o) => {
            o.setName(option.name)
              .setDescription(option.description)
              .setRequired(option.required ?? false)
              .setAutocomplete(option.autocomplete ?? false);
            if (option.minLength !== undefined) {
              o.setMinLength(option.minLength);
            }
            if (option.maxLength !== undefined) {
              o.setMaxLength(option.maxLength);
            }
            if (!option.autocomplete && option.choices) {
              o.setChoices(...option.choices);
            }
            return o;
          });
          break;
        case ApplicationCommandOptionType.Channel:
          builder.addChannelOption((o) => {
            o.setName(option.name)
              .setDescription(option.description)
              .setRequired(option.required ?? false);
            if (option.channelTypes) {
              o.addChannelTypes(...option.channelTypes);
            }
            return o;
          });
          break;
        case ApplicationCommandOptionType.Role:
          builder.addRoleOption((o) =>
            o
              .setName(option.name)
              .setDescription(option.description)
              .setRequired(option.required ?? false),
          );
          break;
        case ApplicationCommandOptionType.User:
          builder.addUserOption((o) =>
            o
              .setName(option.name)
              .setDescription(option.description)
              .setRequired(option.required ?? false),
          );
          break;
        case ApplicationCommandOptionType.Mentionable:
          builder.addMentionableOption((o) =>
            o
              .setName(option.name)
              .setDescription(option.description)
              .setRequired(option.required ?? false),
          );
          break;
        case ApplicationCommandOptionType.Boolean:
          builder.addBooleanOption((o) =>
            o
              .setName(option.name)
              .setDescription(option.description)
              .setRequired(option.required ?? false),
          );
          break;
        case ApplicationCommandOptionType.Attachment:
          builder.addAttachmentOption((o) =>
            o
              .setName(option.name)
              .setDescription(option.description)
              .setRequired(option.required ?? false),
          );
          break;
        default:
          option satisfies never;
          throw new LichobiError(
            `Unhandled chat input command option type: ${option["type"]}`,
          );
      }
    });
    return builder;
  }

  private buildMessageContextMenuDiscordCommandData(
    command: LichobiCommandTypeToClassMap["MESSAGE"],
  ): ApplicationCommandDataResolvable {
    const commandData = {
      ...command.getBaseCommandData(),
    };
    return new ContextMenuCommandBuilder()
      .setName(commandData.name)
      .setType(ApplicationCommandType.Message);
  }

  private buildUserContextMenuDiscordCommandData(
    command: LichobiCommandTypeToClassMap["USER"],
  ): ApplicationCommandDataResolvable {
    const commandData = {
      ...command.getBaseCommandData(),
    };
    return new ContextMenuCommandBuilder()
      .setName(commandData.name)
      .setType(ApplicationCommandType.User);
  }
}
