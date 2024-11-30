import { LichobiCommand } from "#lichobi/framework";
import { ChatInputCommandInteraction, EmbedBuilder, Message } from "discord.js";

type EmbedBuildData = {
  roundtripLatency: number;
};

export default class InfoCommand extends LichobiCommand(
  LichobiCommand.Base({
    name: "info",
    description: "Get some info about me.",
  }),
  LichobiCommand.ChatInputCommandMixin(),
  LichobiCommand.LegacyMessageCommandMixin(),
) {
  public async handleChatInput(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const infoMessage = await interaction.deferReply({ fetchReply: true });
    const infoEmbed = this.buildInfoEmbed({
      roundtripLatency: Math.round(
        infoMessage.createdTimestamp - interaction.createdTimestamp,
      ),
    });
    await interaction.editReply({
      embeds: [infoEmbed],
    });
  }

  public async handleLegacyMessage(message: Message): Promise<void> {
    const infoMessage = await message.channel.send({
      content: "Crunching latest info...",
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

  private buildInfoEmbed(data: EmbedBuildData) {
    const { client } = this.bot;
    return new EmbedBuilder()
      .setTitle(`${client.user.username}'s info`)
      .setDescription(
        [
          `⌛ **Roundtrip Latency:** ${data.roundtripLatency}ms`,
          `💓 **Websocket Heartbeat:** ${Math.round(client.ws.ping)}ms`,
        ].join("\n"),
      );
  }
}
