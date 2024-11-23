import { BaseApplicationCommandData } from "discord.js";
import { Bot } from "../bot.js";

export abstract class BaseCommand {
  public readonly bot: Bot<true>;

  constructor(bot: Bot<true>) {
    this.bot = bot;
  }

  public abstract getBaseCommandData(): BaseApplicationCommandData;
}

export function Command(baseCommandData: BaseApplicationCommandData) {
  abstract class ExtendedBaseCommand extends BaseCommand {
    public getBaseCommandData(): BaseApplicationCommandData {
      return baseCommandData;
    }
  }
  return ExtendedBaseCommand;
}

export type BaseCommandClass = ReturnType<typeof Command>;
