import {
  ApplicationCommandOptionAllowedChannelTypes,
  ApplicationCommandOptionType,
  AutocompleteInteraction,
  CacheType,
  ChannelType,
  ChatInputCommandInteraction,
  CommandInteractionOption,
} from "discord.js";
import { Simplify } from "type-fest";
import { LichobiError } from "../errors.js";

type BaseChatInputCommandOption = {
  name: string;
  description: string;
  required?: boolean;
  autocomplete?: never;
};

type ChatInputCommandAutocompleteNumberOption = Simplify<
  Omit<BaseChatInputCommandOption, "autocomplete"> & {
    type: ApplicationCommandOptionType.Number;
    minValue?: number;
    maxValue?: number;
    autocomplete: true;
  }
>;

type ChatInputCommandAutocompleteIntegerOption = Simplify<
  Omit<BaseChatInputCommandOption, "autocomplete"> & {
    type: ApplicationCommandOptionType.Integer;
    minValue?: number;
    maxValue?: number;
    autocomplete: true;
  }
>;

type ChatInputCommandAutocompleteStringOption = Simplify<
  Omit<BaseChatInputCommandOption, "autocomplete"> & {
    type: ApplicationCommandOptionType.String;
    minLength?: number;
    maxLength?: number;
    autocomplete: true;
  }
>;

type ChatInputCommandOptionChoiceData<Value extends string | number> = {
  name: string;
  value: Value;
};

type ChatInputCommandNumberOption = Simplify<
  Omit<BaseChatInputCommandOption, "autocomplete"> & {
    type: ApplicationCommandOptionType.Number;
    minValue?: number;
    maxValue?: number;
    choices?: readonly ChatInputCommandOptionChoiceData<number>[];
    autocomplete?: false;
  }
>;

type ChatInputCommandIntegerOption = Simplify<
  Omit<BaseChatInputCommandOption, "autocomplete"> & {
    type: ApplicationCommandOptionType.Integer;
    minValue?: number;
    maxValue?: number;
    choices?: readonly ChatInputCommandOptionChoiceData<number>[];
    autocomplete?: false;
  }
>;

type ChatInputCommandStringOption = Simplify<
  Omit<BaseChatInputCommandOption, "autocomplete"> & {
    type: ApplicationCommandOptionType.String;
    minLength?: number;
    maxLength?: number;
    choices?: readonly ChatInputCommandOptionChoiceData<string>[];
    autocomplete?: false;
  }
>;

type ChatInputCommandChannelOption = Simplify<
  BaseChatInputCommandOption & {
    type: ApplicationCommandOptionType.Channel;
    channelTypes?: readonly ApplicationCommandOptionAllowedChannelTypes[];
  }
>;

type ChatInputCommandRoleOption = Simplify<
  BaseChatInputCommandOption & {
    type: ApplicationCommandOptionType.Role;
  }
>;

type ChatInputCommandUserOption = Simplify<
  BaseChatInputCommandOption & {
    type: ApplicationCommandOptionType.User;
  }
>;

type ChatInputCommandMentionableOption = Simplify<
  BaseChatInputCommandOption & {
    type: ApplicationCommandOptionType.Mentionable;
  }
>;

type ChatInputCommandBooleanOption = Simplify<
  BaseChatInputCommandOption & {
    type: ApplicationCommandOptionType.Boolean;
  }
>;

type ChatInputCommandAttachmentOption = Simplify<
  BaseChatInputCommandOption & {
    type: ApplicationCommandOptionType.Attachment;
  }
>;

type ChatInputCommandOption =
  | ChatInputCommandAutocompleteNumberOption
  | ChatInputCommandAutocompleteIntegerOption
  | ChatInputCommandAutocompleteStringOption
  | ChatInputCommandNumberOption
  | ChatInputCommandIntegerOption
  | ChatInputCommandStringOption
  | ChatInputCommandChannelOption
  | ChatInputCommandRoleOption
  | ChatInputCommandUserOption
  | ChatInputCommandMentionableOption
  | ChatInputCommandBooleanOption
  | ChatInputCommandAttachmentOption;

type ChatInputCommandData = {
  options?: readonly ChatInputCommandOption[];
};

type ChatInputOptions<CommandData extends ChatInputCommandData> =
  CommandData["options"] extends readonly ChatInputCommandOption[]
    ? CommandData["options"]
    : readonly [];

type OptionTypeToValueTypeMap<Cached extends CacheType = CacheType> = {
  [ApplicationCommandOptionType.Number]: ReturnType<
    ChatInputCommandInteraction<Cached>["options"]["getNumber"]
  >;
  [ApplicationCommandOptionType.Integer]: ReturnType<
    ChatInputCommandInteraction<Cached>["options"]["getInteger"]
  >;
  [ApplicationCommandOptionType.String]: ReturnType<
    ChatInputCommandInteraction<Cached>["options"]["getString"]
  >;
  [ApplicationCommandOptionType.Role]: ReturnType<
    ChatInputCommandInteraction<Cached>["options"]["getRole"]
  >;
  [ApplicationCommandOptionType.User]: ReturnType<
    ChatInputCommandInteraction<Cached>["options"]["getUser"]
  >;
  [ApplicationCommandOptionType.Mentionable]: ReturnType<
    ChatInputCommandInteraction<Cached>["options"]["getMentionable"]
  >;
  [ApplicationCommandOptionType.Boolean]: ReturnType<
    ChatInputCommandInteraction<Cached>["options"]["getBoolean"]
  >;
  [ApplicationCommandOptionType.Attachment]: ReturnType<
    ChatInputCommandInteraction<Cached>["options"]["getAttachment"]
  >;
};

type OptionToValueType<
  Option extends ChatInputCommandOption,
  Cached extends CacheType = CacheType,
> = Option extends ChatInputCommandChannelOption
  ? // Change to using OptionTypeToValueTypeMap once there is a way to pass the generic type argument
    Extract<
      NonNullable<CommandInteractionOption<Cached>["channel"]>,
      {
        type: NonNullable<Option["channelTypes"]>[number] extends
          | ChannelType.PublicThread
          | ChannelType.AnnouncementThread
          ? ChannelType.PublicThread | ChannelType.AnnouncementThread
          : NonNullable<Option["channelTypes"]>[number];
      }
    > | null
  : Option["type"] extends keyof OptionTypeToValueTypeMap
    ? OptionTypeToValueTypeMap[Option["type"]]
    : never;

type PossibleOptionValues = {
  [OptionType in ApplicationCommandOptionType]: OptionToValueType<
    Extract<ChatInputCommandOption, { type: OptionType }>
  >;
}[ApplicationCommandOptionType];

type ChatInputCommandExtractedOptions<
  Options extends readonly ChatInputCommandOption[],
  Cached extends CacheType = CacheType,
> = {
  [Option in Options[number] as Option["name"]]: Option["required"] extends true
    ? NonNullable<OptionToValueType<Option, Cached>>
    : OptionToValueType<Option, Cached>;
};

export abstract class BaseChatInputCommandMixin<
  Cached extends CacheType = CacheType,
  CommandData extends ChatInputCommandData = ChatInputCommandData,
> {
  public abstract getAdditionalChatInputCommandData(): CommandData;

  protected extractChatInputOptionsData(
    interaction: ChatInputCommandInteraction<Cached>,
  ): Simplify<
    ChatInputCommandExtractedOptions<ChatInputOptions<CommandData>, Cached>
  > {
    return Object.fromEntries(
      this.getAdditionalChatInputCommandData().options?.map((option) => [
        option.name,
        this.extractChatInputOptionValue(interaction, option),
      ]) ?? [],
    ) as ChatInputCommandExtractedOptions<
      ChatInputOptions<CommandData>,
      Cached
    >;
  }

  private extractChatInputOptionValue(
    interaction: ChatInputCommandInteraction<Cached>,
    option: ChatInputCommandOption,
  ): PossibleOptionValues {
    switch (option.type) {
      case ApplicationCommandOptionType.Number:
        return interaction.options.getNumber(option.name, option.required);
      case ApplicationCommandOptionType.Integer:
        return interaction.options.getInteger(option.name, option.required);
      case ApplicationCommandOptionType.String:
        return interaction.options.getString(option.name, option.required);
      case ApplicationCommandOptionType.Channel:
        return interaction.options.getChannel(
          option.name,
          option.required,
          option.channelTypes,
        );
      case ApplicationCommandOptionType.Role:
        return interaction.options.getRole(option.name, option.required);
      case ApplicationCommandOptionType.User:
        return interaction.options.getUser(option.name, option.required);
      case ApplicationCommandOptionType.Mentionable:
        return interaction.options.getMentionable(option.name, option.required);
      case ApplicationCommandOptionType.Boolean:
        return interaction.options.getBoolean(option.name, option.required);
      case ApplicationCommandOptionType.Attachment:
        return interaction.options.getAttachment(option.name, option.required);
      default:
        option satisfies never;
        throw new LichobiError(`Unknown option: ${option}`);
    }
  }

  public abstract handleChatInput(
    interaction: ChatInputCommandInteraction<Cached>,
  ): Promise<void>;

  public handleAutocomplete?(
    interaction: AutocompleteInteraction<Cached>,
  ): Promise<void>;
}

export function ChatInputCommandMixin<
  Cached extends CacheType = CacheType,
  const CommandData extends ChatInputCommandData = ChatInputCommandData,
>(chatInputCommandData?: CommandData) {
  abstract class ExtendedBaseChatInputCommandMixin extends BaseChatInputCommandMixin<
    Cached,
    CommandData
  > {
    public override getAdditionalChatInputCommandData(): CommandData {
      return chatInputCommandData || ({} as CommandData);
    }
  }
  return ExtendedBaseChatInputCommandMixin;
}

export type ChatInputCommandMixinClass<
  Cached extends CacheType = CacheType,
  ChatInputData extends ChatInputCommandData = ChatInputCommandData,
> = ReturnType<typeof ChatInputCommandMixin<Cached, ChatInputData>>;
