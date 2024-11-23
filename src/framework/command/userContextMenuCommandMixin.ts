import { CacheType, UserContextMenuCommandInteraction } from "discord.js";

export abstract class BaseUserContextMenuCommandMixin<
  Cached extends CacheType = CacheType,
> {
  public abstract handleUserContext(
    interaction: UserContextMenuCommandInteraction<Cached>,
  ): Promise<void>;
}

export function UserContextMenuCommandMixin<
  Cached extends CacheType = CacheType,
>() {
  return BaseUserContextMenuCommandMixin<Cached>;
}
export type UserContextMenuCommandMixinClass<
  Cached extends CacheType = CacheType,
> = ReturnType<typeof UserContextMenuCommandMixin<Cached>>;
