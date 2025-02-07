import { LichobiCommand } from "#lichobi/framework";
import { CodeRunner, CodeRunnerParams } from "#root/utils/codeRunner.js";
import {
  APIEmbed,
  EmbedBuilder,
  JSONEncodable,
  Message,
  MessageContextMenuCommandInteraction,
} from "discord.js";

export default class RuncodeCommand extends LichobiCommand(
  LichobiCommand.Base({
    name: "runcode",
  }),
  LichobiCommand.MessageContextMenuCommandMixin(),
  LichobiCommand.LegacyMessageCommandMixin({
    description: "Run the code inside a code block!",
  }),
) {
  public async handleMessageContext(
    interaction: MessageContextMenuCommandInteraction,
  ): Promise<void> {
    await interaction.deferReply();
    const responseEmbed = await this.generateResponseEmbed(
      interaction.targetMessage.content,
    );
    await interaction.editReply({ embeds: [responseEmbed] });
  }

  public async handleLegacyMessage(message: Message): Promise<void> {
    const responseEmbed = await this.generateResponseEmbed(message.content);
    await message.reply({ embeds: [responseEmbed] });
  }

  private async generateResponseEmbed(
    messageContent: string,
  ): Promise<JSONEncodable<APIEmbed>> {
    const CodeRunnerParams =
      RuncodeCommand.extractCodeRunnerParams(messageContent);
    if (!CodeRunnerParams) {
      return new EmbedBuilder()
        .setTitle("Invalid code block!")
        .setDescription("The message does not contain a valid code block.")
        .setColor("Red");
    }
    const codeRunner = CodeRunner.getInstance();
    const { output, error } = await codeRunner.runCode(CodeRunnerParams);
    return new EmbedBuilder()
      .setTitle("Code Runner Result")
      .addFields([
        {
          name: "Output",
          value: output || "No output",
        },
        {
          name: "Error",
          value: error || "No error",
        },
      ])
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
