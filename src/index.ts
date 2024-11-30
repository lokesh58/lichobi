import { Bot } from "#lichobi/framework";
import config from "#root/config.js";
import { Events, GatewayIntentBits } from "discord.js";
import InfoCommand from "./commands/info.js";

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

const commands = [new InfoCommand(bot as Bot<true>)];

bot.client.on(Events.MessageCreate, (message) => {
  for (const command of commands) {
    if (message.content.toLowerCase() !== command.getBaseCommandData().name) {
      continue;
    }
    command.handleLegacyMessage(message);
    break;
  }
});

bot.bootUp(config.discordBotToken);
