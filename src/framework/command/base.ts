import { hasMixin } from "ts-mixer";
import { Bot } from "../bot.js";
import { BaseChatInputCommandMixin } from "./chatInputCommandMixin.js";
import { BaseLegacyMessageCommandMixin } from "./legacyMessageCommandMixin.js";
import { BaseMessageContextMenuCommandMixin } from "./messageContextMenuCommandMixin.js";
import { BaseUserContextMenuCommandMixin } from "./userContextMenuCommandMixin.js";

type BaseCommandData = {
  name: string;
  description: string;
};

export abstract class BaseCommand {
  protected readonly bot: Bot<true>;

  constructor(bot: Bot<true>) {
    this.bot = bot;
  }

  public abstract getBaseCommandData(): BaseCommandData;

  public hasChatInputMixin(): this is BaseChatInputCommandMixin {
    return hasMixin(this, BaseChatInputCommandMixin);
  }

  public hasLegacyMessageMixin(): this is BaseLegacyMessageCommandMixin {
    return hasMixin(this, BaseLegacyMessageCommandMixin);
  }

  public hasMessageContextMenuMixin(): this is BaseMessageContextMenuCommandMixin {
    return hasMixin(this, BaseMessageContextMenuCommandMixin);
  }

  public hasUserContextMenuMixin(): this is BaseUserContextMenuCommandMixin {
    return hasMixin(this, BaseUserContextMenuCommandMixin);
  }
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
