import { LichobiCommand } from "#lichobi/framework";
import { ChatInputCommandInteraction, EmbedBuilder, Message } from "discord.js";

type EmbedBuildData = {
  roundtripLatency: number;
};

export class InfoCommand extends LichobiCommand(
  LichobiCommand.Base({
    name: "info",
    description: "Get some info about me.",
  }),
  LichobiCommand.ChatInputCommandMixin(),
  LichobiCommand.LegacyMessageCommandMixin(),
) {
  public override async handleChatInput(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    await interaction.deferReply();
    const infoMessage = await interaction.fetchReply();
    const infoEmbed = this.buildInfoEmbed({
      roundtripLatency: Math.round(
        infoMessage.createdTimestamp - interaction.createdTimestamp,
      ),
    });
    await interaction.editReply({
      embeds: [infoEmbed],
    });
  }

  public override async handleLegacyMessage(message: Message): Promise<void> {
    const infoMessage = await message.reply({
      content: "⏳ Crunching latest info...",
    });
    const infoEmbed = this.buildInfoEmbed({
      roundtripLatency: Math.round(
        infoMessage.createdTimestamp - message.createdTimestamp,
      ),
    });
    await infoMessage.edit({
      content: "",
      embeds: [infoEmbed],
    });
  }

  private buildInfoEmbed(data: EmbedBuildData): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(`${this.bot.client.user.username}'s info`)
      .setDescription(
        [
          `⏱️ **Roundtrip Latency:** ${data.roundtripLatency}ms`,
          `📡 **Websocket Latency:** ${Math.round(this.bot.client.ws.ping)}ms`,
        ].join("\n"),
      );
  }
}
