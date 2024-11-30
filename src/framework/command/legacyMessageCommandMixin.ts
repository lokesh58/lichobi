import { LocalizationMap, Message } from "discord.js";

type LegacyMessageCommandOption = {
  name: string;
  nameLocalizations?: LocalizationMap;
  description: string;
  descriptionLocalizations?: LocalizationMap;
};

type LegacyMessageCommandData = {
  description?: string;
  descriptionLocalizations?: LocalizationMap;
  expectedUsage?: string;
  expectedUsageLocalizations?: LocalizationMap;
  options?: LegacyMessageCommandOption[];
};

export abstract class BaseLegacyMessageCommandMixin<
  InGuild extends boolean = boolean,
> {
  public abstract getLegacyMessageCommandData(): LegacyMessageCommandData;

  public abstract handleLegacyMessage(message: Message<InGuild>): Promise<void>;
}

export function LegacyMessageCommandMixin<InGuild extends boolean = boolean>(
  legacyMessageCommandData?: LegacyMessageCommandData,
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
