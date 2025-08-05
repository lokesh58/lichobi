import { Awaitable, Message } from "discord.js";
import { Bot } from "../bot.js";

type BaseChatParticipantData = {
  name: string;
  description: string;
  priority: number;
};

export abstract class BaseChatParticipant {
  protected readonly bot: Bot<true>;

  constructor(bot: Bot<true>) {
    this.bot = bot;
  }

  public setup?(): Awaitable<void> {}

  public abstract getBaseChatParticipantData(): BaseChatParticipantData;

  public abstract shouldRespond(message: Message): Promise<boolean>;

  public abstract getResponse(message: Message): Promise<string>;
}

export function ChatParticipant(
  baseChatParticipantData: BaseChatParticipantData,
) {
  abstract class ExtendedBaseChatParticipant extends BaseChatParticipant {
    public override getBaseChatParticipantData(): BaseChatParticipantData {
      return baseChatParticipantData;
    }
  }
  return ExtendedBaseChatParticipant;
}

export type BaseChatParticipantClass = ReturnType<typeof ChatParticipant>;

