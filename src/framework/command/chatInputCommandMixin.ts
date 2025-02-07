import {
  ApplicationCommandAttachmentOption,
  ApplicationCommandAutocompleteNumericOption,
  ApplicationCommandAutocompleteStringOption,
  ApplicationCommandBooleanOption,
  ApplicationCommandChannelOption,
  ApplicationCommandMentionableOption,
  ApplicationCommandNumericOption,
  ApplicationCommandOptionType,
  ApplicationCommandRoleOption,
  ApplicationCommandStringOption,
  ApplicationCommandUserOption,
  AutocompleteInteraction,
  CacheType,
  ChannelType,
  ChatInputCommandInteraction,
  CommandInteractionOption,
  LocalizationMap,
} from "discord.js";
import { Simplify } from "type-fest";
import { LichobiError } from "../errors.js";

type ApplicationCommandAutocompleteNumberOption = Exclude<
  ApplicationCommandAutocompleteNumericOption,
  "type"
> & {
  type: ApplicationCommandOptionType.Number;
};

type ApplicationCommandAutocompleteIntegerOption = Exclude<
  ApplicationCommandAutocompleteNumericOption,
  "type"
> & {
  type: ApplicationCommandOptionType.Integer;
};

type ApplicationCommandNumberOption = Exclude<
  ApplicationCommandNumericOption,
  "type"
> & {
  type: ApplicationCommandOptionType.Number;
};

type ApplicationCommandIntegerOption = Exclude<
  ApplicationCommandNumericOption,
  "type"
> & {
  type: ApplicationCommandOptionType.Integer;
};

type ChatInputCommandOption =
  | ApplicationCommandAutocompleteNumberOption
  | ApplicationCommandAutocompleteIntegerOption
  | ApplicationCommandAutocompleteStringOption
  | ApplicationCommandNumberOption
  | ApplicationCommandIntegerOption
  | ApplicationCommandStringOption
  | ApplicationCommandChannelOption
  | ApplicationCommandRoleOption
  | ApplicationCommandUserOption
  | ApplicationCommandMentionableOption
  | ApplicationCommandBooleanOption
  | ApplicationCommandAttachmentOption;

type ChatInputCommandData = {
  description: string;
  descriptionLocalizations?: LocalizationMap;
  options?: readonly ChatInputCommandOption[];
};

type ChatInputOptions<CommandData extends ChatInputCommandData> =
  CommandData["options"] extends readonly ChatInputCommandOption[]
    ? CommandData["options"]
    : readonly [];

type OptionTypeToValueType<
  Option extends ChatInputCommandOption,
  Cached extends CacheType = CacheType,
> = Option extends ApplicationCommandNumberOption
  ? ReturnType<ChatInputCommandInteraction<Cached>["options"]["getNumber"]>
  : Option extends ApplicationCommandIntegerOption
    ? ReturnType<ChatInputCommandInteraction<Cached>["options"]["getInteger"]>
    : Option extends ApplicationCommandStringOption
      ? ReturnType<ChatInputCommandInteraction<Cached>["options"]["getString"]>
      : Option extends ApplicationCommandChannelOption
        ? // Change to using ReturnType once there is a way to pass the generic type argument
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
        : Option extends ApplicationCommandRoleOption
          ? ReturnType<
              ChatInputCommandInteraction<Cached>["options"]["getRole"]
            >
          : Option extends ApplicationCommandUserOption
            ? ReturnType<
                ChatInputCommandInteraction<Cached>["options"]["getUser"]
              >
            : Option extends ApplicationCommandMentionableOption
              ? ReturnType<
                  ChatInputCommandInteraction<Cached>["options"]["getMentionable"]
                >
              : Option extends ApplicationCommandBooleanOption
                ? ReturnType<
                    ChatInputCommandInteraction<Cached>["options"]["getBoolean"]
                  >
                : Option extends ApplicationCommandAttachmentOption
                  ? ReturnType<
                      ChatInputCommandInteraction<Cached>["options"]["getAttachment"]
                    >
                  : never;

type PossibleOptionValues = {
  [OptionType in ApplicationCommandOptionType]: OptionTypeToValueType<
    Extract<ChatInputCommandOption, { type: OptionType }>
  >;
}[ApplicationCommandOptionType];

type ChatInputCommandExtractedOptions<
  Options extends readonly ChatInputCommandOption[],
  Cached extends CacheType = CacheType,
> = {
  [Option in Options[number] as Option["name"]]: Option["required"] extends true
    ? NonNullable<OptionTypeToValueType<Option, Cached>>
    : OptionTypeToValueType<Option, Cached>;
};

export abstract class BaseChatInputCommandMixin<
  Cached extends CacheType = CacheType,
  CommandData extends ChatInputCommandData = ChatInputCommandData,
> {
  public abstract getChatInputCommandData(): CommandData;

  protected extractChatInputOptionsData(
    interaction: ChatInputCommandInteraction<Cached>,
  ): Simplify<
    ChatInputCommandExtractedOptions<ChatInputOptions<CommandData>, Cached>
  > {
    return Object.fromEntries(
      this.getChatInputCommandData().options?.map((option) => [
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
>(chatInputCommandData: CommandData) {
  abstract class ExtendedBaseChatInputCommandMixin extends BaseChatInputCommandMixin<
    Cached,
    CommandData
  > {
    public getChatInputCommandData(): CommandData {
      return chatInputCommandData || ({} as CommandData);
    }
  }
  return ExtendedBaseChatInputCommandMixin;
}

export type ChatInputCommandMixinClass<
  Cached extends CacheType = CacheType,
  ChatInputData extends ChatInputCommandData = ChatInputCommandData,
> = ReturnType<typeof ChatInputCommandMixin<Cached, ChatInputData>>;
