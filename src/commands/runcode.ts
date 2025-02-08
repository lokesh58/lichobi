import { LichobiCommand } from "#lichobi/framework";
import { CodeRunner } from "#root/utils/codeRunner.js";
import {
  ActionRowBuilder,
  EmbedBuilder,
  Message,
  MessageContextMenuCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

type CodeBlock = {
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
  private static readonly InputElementId: string = "programInput";

  public override async handleMessageContext(
    interaction: MessageContextMenuCommandInteraction,
  ): Promise<void> {
    const codeBlock = RuncodeCommand.extractCodeBlock(
      interaction.targetMessage.content,
    );
    if (!codeBlock) {
      await interaction.reply({
        embeds: [RuncodeCommand.getInvalidCodeBlockEmbed()],
        ephemeral: true,
      });
      return;
    }

    const modalCustomId = `codeInput-${interaction.id}`;
    const modal = RuncodeCommand.createInputModal(modalCustomId);
    await interaction.showModal(modal);

    const modalResponse = await interaction
      .awaitModalSubmit({
        time: 120_000,
        filter: (i) => i.customId === modalCustomId,
      })
      .catch((reason) => this.bot.logger.error(reason));

    if (!modalResponse) {
      return;
    }

    await modalResponse.deferReply();
    const input = modalResponse.fields.getTextInputValue(
      RuncodeCommand.InputElementId,
    );
    const responseEmbed = await RuncodeCommand.generateResponseEmbed(
      codeBlock,
      input,
    );
    await modalResponse.editReply({ embeds: [responseEmbed] });
  }

  private static createInputModal(modalCustomId: string): ModalBuilder {
    const modal = new ModalBuilder()
      .setCustomId(modalCustomId)
      .setTitle("Program Input");

    const inputField = new TextInputBuilder()
      .setCustomId(RuncodeCommand.InputElementId)
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
    const codeBlock = RuncodeCommand.extractCodeBlock(message.content);
    if (!codeBlock) {
      await message.reply({
        embeds: [RuncodeCommand.getInvalidCodeBlockEmbed()],
      });
      return;
    }
    const responseEmbed = await RuncodeCommand.generateResponseEmbed(codeBlock);
    await message.reply({ embeds: [responseEmbed] });
  }

  private static extractCodeBlock(messageContent: string): CodeBlock | null {
    const [res] = messageContent.matchAll(
      /(?<!\\)(```)(?<=```)(?:([a-z][a-z0-9]*)\s)(.*?)(?<!\\)(?=```)((?:\\\\)*```)/gs,
    );
    if (!res || !res[2] || !res[3]) return null;
    return {
      language: res[2],
      code: res[3],
    };
  }

  private static getInvalidCodeBlockEmbed(): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle("Invalid code block!")
      .setDescription("The message does not contain a valid code block.")
      .setColor("Red");
  }

  private static async generateResponseEmbed(
    codeBlock: CodeBlock,
    input?: string,
  ): Promise<EmbedBuilder> {
    const codeRunner = CodeRunner.getInstance();
    const { output, error } = await codeRunner.runCode({
      language: codeBlock.language,
      code: codeBlock.code,
      input: input || "",
    });
    return new EmbedBuilder()
      .setTitle("Code Runner Result")
      .addFields(
        [
          { name: "Input", value: input || "No input" },
          { name: "Output", value: output || "No output" },
          { name: "Error", value: error || "No error" },
        ].filter((x) => !!x),
      )
      .setColor("Green");
  }
}
