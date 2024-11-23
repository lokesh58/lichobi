import config from "#root/config.js";
import { Bot } from "#lichobi/framework";
import { Events, GatewayIntentBits } from "discord.js";

const bot = new Bot({
  clientOptions: {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  },
  loggerOptions: {
    minLogLevel: config.minLogLevel ?? "info",
  },
});

bot.client.once(Events.ClientReady, (readyClient) => {
  bot.logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
});

bot.client.on(Events.MessageCreate, (message) => {
  if (message.content.toLowerCase() === "ping") return message.reply("Pong!");
});

bot.bootUp(config.discordBotToken);
