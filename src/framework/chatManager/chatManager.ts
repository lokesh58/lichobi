import { Events } from "discord.js";
import { Bot } from "../bot.js";
import { LichobiEvent } from "../event/index.js";
import { ChatRegistry } from "./chatRegistry.js";

export type ChatManagerOptions = {
  chatParticipantsFolder: string;
};

export class ChatManager {
  private readonly bot: Bot<true>;
  private readonly chatParticipantsFolder: string;
  public readonly participants: ChatRegistry;

  constructor(bot: Bot<true>, options: ChatManagerOptions) {
    this.bot = bot;
    this.participants = new ChatRegistry(bot);
    this.chatParticipantsFolder = options.chatParticipantsFolder;
  }

  public async loadChatParticipants(): Promise<void> {
    await this.participants.loadFromFolder(this.chatParticipantsFolder);
  }

  public startChatHandler(): void {
    this.bot.eventManager.registerEvent(
      LichobiEvent({
        name: "chat-handler",
        event: Events.MessageCreate,
        handler: async (message) => {
          if (message.author.bot) {
            return;
          }
          const { channel } = message;
          if (!channel.isSendable()) {
            return;
          }
          const prefix = await this.bot.prefixManager.getCommandPrefix(message);
          if (message.content.startsWith(prefix)) {
            // command manager will handle this
            return;
          }

          const participants = this.participants.getAll();

          for (const participant of participants) {
            try {
              const shouldRespond = await participant.shouldRespond(message);
              if (!shouldRespond) {
                continue;
              }
              this.bot.logger.info(
                `${participant.getBaseChatParticipantData().name} responding to message from ${message.author.tag}`,
              );
              const [, response] = await Promise.all([
                channel.sendTyping(),
                participant.getResponse(message),
              ]);
              await message.reply(response);
              break;
            } catch (error) {
              this.bot.logger.error(
                `Error in chat participant ${participant.getBaseChatParticipantData().name}:`,
                error,
              );
            }
          }
        },
      }),
    );
  }
}
