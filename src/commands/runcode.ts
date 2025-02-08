import { LichobiCommand } from "#lichobi/framework";
import { CodeRunner, CodeRunnerParams } from "#root/utils/codeRunner.js";
import {
  ActionRowBuilder,
  APIEmbed,
  EmbedBuilder,
  JSONEncodable,
  Message,
  MessageContextMenuCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export default class RuncodeCommand extends LichobiCommand(
  LichobiCommand.Base({
    name: "runcode",
    description: "Run the code inside a code block!",
  }),
  LichobiCommand.MessageContextMenuCommandMixin(),
  LichobiCommand.LegacyMessageCommandMixin(),
) {
  public override async handleMessageContext(
    interaction: MessageContextMenuCommandInteraction,
  ): Promise<void> {
    const params = RuncodeCommand.extractCodeRunnerParams(
      interaction.targetMessage.content,
    );
    if (!params) {
      await interaction.reply({
        embeds: [this.getInvalidCodeBlockEmbed()],
        ephemeral: true,
      });
      return;
    }

    const modalCustomId = `codeInput-${interaction.id}`;
    const modal = new ModalBuilder()
      .setCustomId(modalCustomId)
      .setTitle("Program Input");

    const inputField = new TextInputBuilder()
      .setCustomId("programInput")
      .setLabel("Enter input for the program (optional)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
      inputField,
    );
    modal.addComponents(row);

    await interaction.showModal(modal);

    const modalResponse = await interaction
      .awaitModalSubmit({
        time: 120000,
        filter: (i) => i.customId === modalCustomId,
      })
      .catch((err) => this.bot.logger.error(err));

    if (!modalResponse) return;

    await modalResponse.deferReply();
    const input = modalResponse.fields.getTextInputValue("programInput");
    const responseEmbed = await this.generateResponseEmbed(
      interaction.targetMessage.content,
      input,
    );
    await modalResponse.editReply({ embeds: [responseEmbed] });
  }

  public override async handleLegacyMessage(message: Message): Promise<void> {
    const responseEmbed = await this.generateResponseEmbed(message.content);
    await message.reply({ embeds: [responseEmbed] });
  }

  private getInvalidCodeBlockEmbed(): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle("Invalid code block!")
      .setDescription("The message does not contain a valid code block.")
      .setColor("Red");
  }

  private async generateResponseEmbed(
    messageContent: string,
    input?: string,
  ): Promise<JSONEncodable<APIEmbed>> {
    const params = RuncodeCommand.extractCodeRunnerParams(messageContent);
    if (!params) {
      return this.getInvalidCodeBlockEmbed();
    }
    if (input) params.input = input;

    const codeRunner = CodeRunner.getInstance();
    const { output, error } = await codeRunner.runCode(params);
    return new EmbedBuilder()
      .setTitle("Code Runner Result")
      .addFields(
        [
          input ? { name: "Input", value: input } : null,
          { name: "Output", value: output || "No output" },
          { name: "Error", value: error || "No error" },
        ].filter((x) => !!x),
      )
      .setColor("Green");
  }

  private static extractCodeRunnerParams(
    messageContent: string,
  ): CodeRunnerParams | null {
    const [res] = messageContent.matchAll(
      /(?<!\\)(```)(?<=```)(?:([a-z][a-z0-9]*)\s)(.*?)(?<!\\)(?=```)((?:\\\\)*```)/gs,
    );
    if (!res || !res[2] || !res[3]) return null;
    return {
      language: res[2],
      code: res[3],
    };
  }
}
