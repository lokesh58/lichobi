import { mix } from "ts-mixer";
import { Class } from "ts-mixer/dist/types/types.js";
import { UnionToIntersection } from "type-fest";
import { Bot } from "../bot.js";
import { BaseCommandClass, Command } from "./base.js";
import {
  ChatInputCommandMixin,
  ChatInputCommandMixinClass,
} from "./chatInputCommandMixin.js";
import {
  LegacyMessageCommandMixin,
  LegacyMessageCommandMixinClass,
} from "./legacyMessageCommandMixin.js";
import {
  MessageContextMenuCommandMixin,
  MessageContextMenuCommandMixinClass,
} from "./messageContextMenuCommandMixin.js";
import {
  UserContextMenuCommandMixin,
  UserContextMenuCommandMixinClass,
} from "./userContextMenuCommandMixin.js";

export { BaseCommand } from "./base.js";
export { BaseChatInputCommandMixin } from "./chatInputCommandMixin.js";
export { BaseMessageContextMenuCommandMixin } from "./messageContextMenuCommandMixin.js";
export { BaseUserContextMenuCommandMixin } from "./userContextMenuCommandMixin.js";

type CommandMixinClass =
  | ChatInputCommandMixinClass
  | LegacyMessageCommandMixinClass
  | MessageContextMenuCommandMixinClass
  | UserContextMenuCommandMixinClass;

type MergedCommandClass<Mixins extends readonly CommandMixinClass[]> = Class<
  [bot: Bot],
  InstanceType<BaseCommandClass> &
    UnionToIntersection<InstanceType<Mixins[number]>>,
  BaseCommandClass & UnionToIntersection<Mixins[number]>
>;

export function LichobiCommand<
  CommandMixins extends readonly [CommandMixinClass, ...CommandMixinClass[]],
>(
  Base: BaseCommandClass,
  ...mixins: CommandMixins
): MergedCommandClass<CommandMixins> {
  @mix(Base, ...mixins)
  abstract class Merged {}
  return Merged as MergedCommandClass<CommandMixins>;
}
LichobiCommand.Base = Command;
LichobiCommand.ChatInputCommandMixin = ChatInputCommandMixin;
LichobiCommand.LegacyMessageCommandMixin = LegacyMessageCommandMixin;
LichobiCommand.MessageContextMenuCommandMixin = MessageContextMenuCommandMixin;
LichobiCommand.UserContextMenuCommandMixin = UserContextMenuCommandMixin;
