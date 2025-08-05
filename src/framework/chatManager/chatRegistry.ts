import { readdirSync } from "fs";
import path from "path";
import { Bot } from "../bot.js";
import {
  BaseChatParticipant,
  isChatParticipantConstructor,
} from "../chatParticipant/index.js";

export class ChatRegistry {
  private static readonly ValidExtensions = [".js", ".mjs", ".cjs", ".ts"];
  private readonly bot: Bot<true>;
  private readonly participants = new Map<string, BaseChatParticipant>();

  constructor(bot: Bot<true>) {
    this.bot = bot;
  }

  public async register(chatParticipant: BaseChatParticipant): Promise<void> {
    const participantName = chatParticipant
      .getBaseChatParticipantData()
      .name.toLowerCase();
    if (this.participants.has(participantName)) {
      this.bot.logger.warn(
        `Chat Participant ${participantName} is already registered. Skipping registration.`,
      );
      return;
    }
    this.participants.set(participantName, chatParticipant);
    this.bot.logger.info(`Registered chat participant ${participantName}`);
    await chatParticipant.setup?.();
  }

  public async loadFromFolder(folderPath: string): Promise<void> {
    await this.loadChatParticipantsRecursive(folderPath);
  }

  private async loadChatParticipantsRecursive(
    folderPath: string,
  ): Promise<void> {
    const items = readdirSync(folderPath, { withFileTypes: true });

    await Promise.all(
      items.map(async (item) => {
        const fullPath = path.join(folderPath, item.name);

        if (item.isDirectory()) {
          await this.loadChatParticipantsRecursive(fullPath);
        } else if (
          item.isFile() &&
          ChatRegistry.ValidExtensions.includes(path.extname(item.name))
        ) {
          const chatParticipants = await this.importChatParticipant(fullPath);
          await Promise.all(
            chatParticipants.map((chatParticipant) =>
              this.register(chatParticipant),
            ),
          );
        }
      }),
    );
  }

  private async importChatParticipant(
    filePath: string,
  ): Promise<BaseChatParticipant[]> {
    this.bot.logger.debug(`Importing chat participants from ${filePath}`);
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

      const chatParticipants: BaseChatParticipant[] = [];

      const potentialChatParticipants = Object.values(module);
      for (const exportedValue of potentialChatParticipants) {
        if (!isChatParticipantConstructor(exportedValue)) {
          continue;
        }
        try {
          const chatParticipant = new exportedValue(this.bot);
          chatParticipants.push(chatParticipant);
        } catch (error) {
          this.bot.logger.error(
            `Failed to instantiate chat participant from ${filePath}:`,
            error,
          );
        }
      }

      if (chatParticipants.length === 0) {
        this.bot.logger.warn(`No valid chat participants found in ${filePath}`);
        return [];
      }

      return chatParticipants;
    } catch (error) {
      this.bot.logger.error(
        `Error loading chat participants from ${filePath}:`,
        error,
      );
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

  public getAll(): BaseChatParticipant[] {
    return Array.from(this.participants.values()).sort(
      (a, b) =>
        b.getBaseChatParticipantData().priority -
        a.getBaseChatParticipantData().priority,
    );
  }

  public get(name: string): BaseChatParticipant | undefined {
    return this.participants.get(name);
  }
}
