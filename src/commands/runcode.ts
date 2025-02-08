import { LichobiCommand } from "#lichobi/framework";
import { CodeRunner } from "#utils/codeRunner.js";
import { LocalCache } from "#utils/localCache.js";
import {
  ActionRowBuilder,
  EmbedBuilder,
  Events,
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
  private static readonly ModalIdPrefix: string = "codeInput-";
  private static readonly InputId: string = "programInput";
  private static readonly codeBlockCache = new LocalCache<CodeBlock>({
    ttlSeconds: 300, // 5 minutes
    cleanupIntervalSeconds: 60, // 1 minute
  });

  public override setup(): void {
    this.bot.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isModalSubmit()) return;
      if (!interaction.customId.startsWith(RuncodeCommand.ModalIdPrefix))
        return;

      const originalCommandInteractionId = interaction.customId.substring(
        RuncodeCommand.ModalIdPrefix.length,
      );
      const codeBlock = RuncodeCommand.codeBlockCache.get(
        originalCommandInteractionId,
      );
      if (!codeBlock) {
        await interaction.reply({
          embeds: [RuncodeCommand.getExpiredCodeBlockEmbed()],
          ephemeral: true,
        });
        return;
      }
      // Clean up cache as a modal interaction will only need to be handled once
      RuncodeCommand.codeBlockCache.delete(originalCommandInteractionId);

      await interaction.deferReply();
      const input = interaction.fields.getTextInputValue(
        RuncodeCommand.InputId,
      );
      const responseEmbed = await RuncodeCommand.generateResponseEmbed(
        codeBlock,
        input,
      );
      await interaction.editReply({ embeds: [responseEmbed] });
    });
  }

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

    RuncodeCommand.codeBlockCache.set(interaction.id, codeBlock);
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

  private static getExpiredCodeBlockEmbed(): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle("Code block expired!")
      .setDescription(
        "The code block has expired. Please try running the command again.",
      )
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
