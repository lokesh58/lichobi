import { Message } from "discord.js";
import { Bot } from "../bot.js";

export type PrefixManagerOptions = {
  defaultPrefix: string;
};

export class PrefixManager {
  private readonly bot: Bot<true>;
  private readonly defaultPrefix: string;

  constructor(bot: Bot<true>, options: PrefixManagerOptions) {
    this.bot = bot;
    this.defaultPrefix = options.defaultPrefix;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getCommandPrefix(message: Message): Promise<string> {
    // TODO: Add support for user specific (?) / guild specific prefixes.
    return this.defaultPrefix;
  }
}
