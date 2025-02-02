import { hasMixin, mix } from "ts-mixer";
import { Class } from "ts-mixer/dist/types/types.js";
import { UnionToIntersection } from "type-fest";
import { BaseCommand, BaseCommandClass, Command } from "./base.js";
import {
  BaseChatInputCommandMixin,
  ChatInputCommandMixin,
  ChatInputCommandMixinClass,
} from "./chatInputCommandMixin.js";
import {
  BaseLegacyMessageCommandMixin,
  LegacyMessageCommandMixin,
  LegacyMessageCommandMixinClass,
} from "./legacyMessageCommandMixin.js";
import {
  BaseMessageContextMenuCommandMixin,
  MessageContextMenuCommandMixin,
  MessageContextMenuCommandMixinClass,
} from "./messageContextMenuCommandMixin.js";
import {
  BaseUserContextMenuCommandMixin,
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
  ConstructorParameters<BaseCommandClass>,
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

export const LichobiCommandType = Object.freeze({
  ChatInput: "CHAT_INPUT",
  LegacyMessage: "LEGACY",
  MessageContextMenu: "MESSAGE",
  UserContextMenu: "USER",
});

export type LichobiCommandType =
  (typeof LichobiCommandType)[keyof typeof LichobiCommandType];

export type LichobiCommandTypeToClassMap = {
  [LichobiCommandType.ChatInput]: BaseCommand & BaseChatInputCommandMixin;
  [LichobiCommandType.LegacyMessage]: BaseCommand &
    BaseLegacyMessageCommandMixin;
  [LichobiCommandType.MessageContextMenu]: BaseCommand &
    BaseMessageContextMenuCommandMixin;
  [LichobiCommandType.UserContextMenu]: BaseCommand &
    BaseUserContextMenuCommandMixin;
};

export function isLichobiCommand(value: unknown): value is BaseCommand {
  return hasMixin(value, BaseCommand);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConcreteConstructor<T extends abstract new (...args: any[]) => any> = new (
  ...args: ConstructorParameters<T>
) => InstanceType<T>;

export function isLichobiCommandConstructor(
  value: unknown,
): value is ConcreteConstructor<typeof BaseCommand> {
  return typeof value === "function" && hasMixin(value.prototype, BaseCommand);
}
