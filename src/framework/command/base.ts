import { BaseApplicationCommandData, LocalizationMap } from "discord.js";
import { Bot } from "../bot.js";

type BaseCommandData = BaseApplicationCommandData & {
  description: string;
  descriptionLocalizations?: LocalizationMap;
};

export abstract class BaseCommand {
  public readonly bot: Bot<true>;

  constructor(bot: Bot<true>) {
    this.bot = bot;
  }

  public abstract getBaseCommandData(): BaseCommandData;
}

export function Command(baseCommandData: BaseCommandData) {
  abstract class ExtendedBaseCommand extends BaseCommand {
    public getBaseCommandData(): BaseCommandData {
      return baseCommandData;
    }
  }
  return ExtendedBaseCommand;
}

export type BaseCommandClass = ReturnType<typeof Command>;
