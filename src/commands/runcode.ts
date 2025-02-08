import {
  LichobiCommand,
  LichobiEvent,
  UserDisplayableError,
  UserInputError,
} from "#lichobi/framework";
import { CodeRunner, LocalCache } from "#root/utils/index.js";
import {
  ActionRowBuilder,
  Colors,
  EmbedBuilder,
  Events,
  Message,
  MessageContextMenuCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  codeBlock,
  inlineCode,
  italic,
} from "discord.js";

type CodeExtract = {
  language: string;
  code: string;
};

export class RuncodeCommand extends LichobiCommand(
  LichobiCommand.Base({
    name: "runcode",
    description: "Run the code inside a code block!",
  }),
  LichobiCommand.MessageContextMenuCommandMixin(),
  LichobiCommand.LegacyMessageCommandMixin(),
) {
  private static readonly ModalIdPrefix: string = "codeInput-";
  private static readonly InputId: string = "programInput";
  private static readonly codeExtractCache = new LocalCache<CodeExtract>({
    ttlSeconds: 300, // 5 minutes
    cleanupIntervalSeconds: 60, // 1 minute
  });

  public override setup(): void {
    this.bot.eventManager.registerEvent(
      LichobiEvent({
        name: "runcode-input-modal-submit",
        event: Events.InteractionCreate,
        handler: async (interaction) => {
          if (!interaction.isModalSubmit()) return;
          if (!interaction.customId.startsWith(RuncodeCommand.ModalIdPrefix))
            return;

          const originalCommandInteractionId = interaction.customId.substring(
            RuncodeCommand.ModalIdPrefix.length,
          );
          const codeExtract = RuncodeCommand.codeExtractCache.get(
            originalCommandInteractionId,
          );
          if (!codeExtract) {
            throw new UserDisplayableError(
              "The command has expired. Please try running the command again.",
            );
          }
          // Clean up cache as a modal submit can only happen once
          RuncodeCommand.codeExtractCache.delete(originalCommandInteractionId);

          await interaction.deferReply();
          const input = interaction.fields.getTextInputValue(
            RuncodeCommand.InputId,
          );
          const responseEmbed = await RuncodeCommand.generateResponseEmbed(
            codeExtract,
            input,
          );
          await interaction.editReply({ embeds: [responseEmbed] });
        },
      }),
    );
  }

  public override async handleMessageContext(
    interaction: MessageContextMenuCommandInteraction,
  ): Promise<void> {
    const codeExtract = await RuncodeCommand.extractCode(
      interaction.targetMessage.content,
    );
    RuncodeCommand.codeExtractCache.set(interaction.id, codeExtract);
    const modal = RuncodeCommand.createInputModal(interaction.id);
    await interaction.showModal(modal);
  }

  private static createInputModal(interactionId: string): ModalBuilder {
    const modal = new ModalBuilder()
      .setCustomId(`${RuncodeCommand.ModalIdPrefix}${interactionId}`)
      .setTitle("Program Input");

    const inputField = new TextInputBuilder()
      .setCustomId(RuncodeCommand.InputId)
      .setLabel("Enter input for the program (optional)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
      inputField,
    );
    modal.addComponents(row);
    return modal;
  }

  public override async handleLegacyMessage(message: Message): Promise<void> {
    const codeExtract = await RuncodeCommand.extractCode(message.content);
    const responseEmbed =
      await RuncodeCommand.generateResponseEmbed(codeExtract);
    await message.reply({ embeds: [responseEmbed] });
  }

  private static async extractCode(
    messageContent: string,
  ): Promise<CodeExtract> {
    const [res] = messageContent.matchAll(
      /(?<!\\)(```)(?<=```)(?:([a-z][a-z0-9]*)\s)(.*?)(?<!\\)(?=```)((?:\\\\)*```)/gs,
    );
    if (!res || !res[2] || !res[3]) {
      throw new UserInputError(
        "The message does not contain a valid code block",
      );
    }
    const supportedLanguages =
      await CodeRunner.getInstance().getSupportedLanguages();
    if (!supportedLanguages.map((l) => l.language).includes(res[2])) {
      throw new UserDisplayableError(
        [
          `Language ${inlineCode(res[2])} is not supported.`,
          "Supported languages are:",
          ...supportedLanguages.map(
            (l) => `• ${l.display} (${inlineCode(l.language)})`,
          ),
        ].join("\n"),
      );
    }
    return {
      language: res[2],
      code: res[3],
    };
  }

  private static async generateResponseEmbed(
    codeExtract: CodeExtract,
    input?: string,
  ): Promise<EmbedBuilder> {
    const { output, error } = await CodeRunner.getInstance().runCode({
      language: codeExtract.language,
      code: codeExtract.code,
      input: input || "",
    });
    const embedColor = !error ? Colors.Green : Colors.Yellow;
    return new EmbedBuilder()
      .setTitle("Code Runner Result")
      .addFields(
        {
          name: "Code",
          value: RuncodeCommand.formatTextForEmbed(
            codeExtract.code,
            codeExtract.language,
          ),
        },
        {
          name: "Input",
          value: input
            ? RuncodeCommand.formatTextForEmbed(input)
            : italic("No input provided"),
        },
        {
          name: "Output",
          value: output
            ? RuncodeCommand.formatTextForEmbed(output)
            : italic("No output generated"),
        },
        {
          name: "Error",
          value: error
            ? RuncodeCommand.formatTextForEmbed(error)
            : italic("No errors occurred"),
        },
      )
      .setColor(embedColor);
  }

  private static formatTextForEmbed(text: string, language?: string): string {
    if (!text) return text;
    const maxFieldLength = 1024;
    const maxContentLength = maxFieldLength - 50; // Leave room for formatting and truncation message
    const displayText =
      text.length <= maxContentLength
        ? text
        : text.slice(0, maxContentLength) + "\n... (truncated)";
    return language ? codeBlock(language, displayText) : codeBlock(displayText);
  }
}
