import { CacheType, MessageContextMenuCommandInteraction } from "discord.js";

export abstract class BaseMessageContextMenuCommandMixin<
  Cached extends CacheType = CacheType,
> {
  public abstract handleMessageContext(
    interaction: MessageContextMenuCommandInteraction<Cached>,
  ): Promise<void>;
}

export function MessageContextMenuCommandMixin<
  Cached extends CacheType = CacheType,
>() {
  return BaseMessageContextMenuCommandMixin<Cached>;
}

export type MessageContextMenuCommandMixinClass<
  Cached extends CacheType = CacheType,
> = ReturnType<typeof MessageContextMenuCommandMixin<Cached>>;
