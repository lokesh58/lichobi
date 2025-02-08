import { Message } from "discord.js";

type LegacyMessageCommandArgsUsageExample = {
  sampleArgs: string;
  description: string;
};

type LegacyMessageCommandArgsUsage = {
  expectedArgs: string;
  description: string;
  examples?: LegacyMessageCommandArgsUsageExample[];
};

type LegacyMessageCommandData = {
  argsUsage?: LegacyMessageCommandArgsUsage;
};

export abstract class BaseLegacyMessageCommandMixin<
  InGuild extends boolean = boolean,
> {
  public abstract getAdditionalLegacyMessageCommandData(): LegacyMessageCommandData;

  public abstract handleLegacyMessage(
    message: Message<InGuild>,
    commandArgString: string,
  ): Promise<void>;
}

export function LegacyMessageCommandMixin<InGuild extends boolean = boolean>(
  legacyMessageCommandData?: LegacyMessageCommandData,
) {
  abstract class ExtendedBaseLegacyMessageCommandMixin extends BaseLegacyMessageCommandMixin<InGuild> {
    public getAdditionalLegacyMessageCommandData(): LegacyMessageCommandData {
      return legacyMessageCommandData || ({} as LegacyMessageCommandData);
    }
  }
  return ExtendedBaseLegacyMessageCommandMixin;
}

export type LegacyMessageCommandMixinClass<InGuild extends boolean = boolean> =
  ReturnType<typeof LegacyMessageCommandMixin<InGuild>>;
