import { Bot } from "#lichobi/framework";
import config from "#root/config.js";
import { GatewayIntentBits } from "discord.js";
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
  prefixManagerOptions: {
    defaultPrefix: config.defaultPrefix || "!",
  },
  commandManagerOptions: {
    commandsFolder: join(__dirname, "commands"),
    devGuildId: config.devGuildId || null,
  },
  chatManagerOptions: {
    chatParticipantsFolder: join(__dirname, "chatParticipants"),
  },
});

bot.bootUp(config.discordBotToken);
