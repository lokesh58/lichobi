import { Client, Events, GatewayIntentBits } from "discord.js";

import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, (message) => {
  console.log(`Recieved message: [${message.author.tag}] ${message.content}`);
  if (message.content.toLowerCase() === "ping") return message.reply("Pong!");
});

client.login(process.env.DISCORD_BOT_TOKEN);
