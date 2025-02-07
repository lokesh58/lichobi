import { Message } from "discord.js";

type LegacyMessageCommandOption = {
  name: string;
  description: string;
};

type LegacyMessageCommandData = {
  description: string;
  expectedUsage?: string;
  options?: LegacyMessageCommandOption[];
};

export abstract class BaseLegacyMessageCommandMixin<
  InGuild extends boolean = boolean,
> {
  public abstract getLegacyMessageCommandData(): LegacyMessageCommandData;

  public abstract handleLegacyMessage(
    message: Message<InGuild>,
    commandArgString: string,
  ): Promise<void>;
}

export function LegacyMessageCommandMixin<InGuild extends boolean = boolean>(
  legacyMessageCommandData: LegacyMessageCommandData,
) {
  abstract class ExtendedBaseLegacyMessageCommandMixin extends BaseLegacyMessageCommandMixin<InGuild> {
    public getLegacyMessageCommandData(): LegacyMessageCommandData {
      return legacyMessageCommandData || ({} as LegacyMessageCommandData);
    }
  }
  return ExtendedBaseLegacyMessageCommandMixin;
}

export type LegacyMessageCommandMixinClass<InGuild extends boolean = boolean> =
  ReturnType<typeof LegacyMessageCommandMixin<InGuild>>;
