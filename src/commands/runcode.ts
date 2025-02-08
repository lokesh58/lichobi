import { LichobiCommand, LichobiEvent } from "#lichobi/framework";
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
  italic,
} from "discord.js";

type CodeExtract = {
  language: string;
  code: string;
};

export default class RuncodeCommand extends LichobiCommand(
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
            await interaction.reply({
              embeds: [RuncodeCommand.getExpiredCodeExtractEmbed()],
              ephemeral: true,
            });
            return;
          }
          // Clean up cache as a modal interaction will only need to be handled once
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
    const codeExtract = RuncodeCommand.extractCode(
      interaction.targetMessage.content,
    );
    if (!codeExtract) {
      await interaction.reply({
        embeds: [RuncodeCommand.getInvalidCodeExtractEmbed()],
        ephemeral: true,
      });
      return;
    }

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
    const codeExtract = RuncodeCommand.extractCode(message.content);
    if (!codeExtract) {
      await message.reply({
        embeds: [RuncodeCommand.getInvalidCodeExtractEmbed()],
      });
      return;
    }
    const responseEmbed =
      await RuncodeCommand.generateResponseEmbed(codeExtract);
    await message.reply({ embeds: [responseEmbed] });
  }

  private static extractCode(messageContent: string): CodeExtract | null {
    const [res] = messageContent.matchAll(
      /(?<!\\)(```)(?<=```)(?:([a-z][a-z0-9]*)\s)(.*?)(?<!\\)(?=```)((?:\\\\)*```)/gs,
    );
    if (!res || !res[2] || !res[3]) return null;
    return {
      language: res[2],
      code: res[3],
    };
  }

  private static getInvalidCodeExtractEmbed(): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle("Invalid code block!")
      .setDescription("The message does not contain a valid code block.")
      .setColor(Colors.Red);
  }

  private static getExpiredCodeExtractEmbed(): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle("Code block expired!")
      .setDescription(
        "The code block has expired. Please try running the command again.",
      )
      .setColor(Colors.Red);
  }

  private static async generateResponseEmbed(
    codeExtract: CodeExtract,
    input?: string,
  ): Promise<EmbedBuilder> {
    const codeRunner = CodeRunner.getInstance();
    const { output, error } = await codeRunner.runCode({
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
