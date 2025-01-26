import { Bot } from "#lichobi/framework";
import config from "#root/config.js";
import { Events, GatewayIntentBits } from "discord.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  commandManagerOptions: {
    commandsFolder: join(__dirname, "commands"),
  },
});

bot.client.once(Events.ClientReady, (readyClient) => {
  bot.logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
});

bot.bootUp(config.discordBotToken);
