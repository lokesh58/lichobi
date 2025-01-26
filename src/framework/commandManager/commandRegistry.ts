import { Bot } from "#lichobi/framework";
import { readdirSync } from "fs";
import path from "path";
import { BaseCommand, isLichobiCommandConstructor } from "../command/index.js";

export class CommandRegistry {
  private static readonly VALID_EXTENSIONS = [".js", ".mjs", ".cjs", ".ts"];
  private readonly commands = new Map<string, BaseCommand>();
  private readonly bot: Bot<true>;

  constructor(bot: Bot<true>) {
    this.bot = bot;
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
          CommandRegistry.VALID_EXTENSIONS.includes(path.extname(item.name))
        ) {
          const commands = await this.importCommand(fullPath);
          commands.forEach((command) => this.register(command));
        }
      }),
    );
  }

  public register(command: BaseCommand): void {
    const commandName = command.getBaseCommandData().name.toLowerCase();
    if (this.commands.has(commandName)) {
      this.bot.logger.warn(
        `Command with name '${commandName}' is already registered. Skipping registration.`,
      );
      return;
    }
    this.commands.set(commandName, command);
    this.bot.logger.info(`Successfully registered command: ${commandName}`);
  }

  public get(name: string): BaseCommand | undefined {
    return this.commands.get(name.toLowerCase());
  }

  public getAll(): BaseCommand[] {
    return [...this.commands.values()];
  }

  private isValidModule(module: unknown): module is Record<string, unknown> {
    return (
      typeof module === "object" &&
      module !== null &&
      !Array.isArray(module) &&
      Object.entries(module as object).length > 0
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
}
