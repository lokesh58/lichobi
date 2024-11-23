import z from "zod";
import { LOG_LEVELS } from "#lichobi/framework";

const envSchema = z.object({
  DISCORD_BOT_TOKEN: z.string(),
  LOG_LEVEL: z.enum(LOG_LEVELS).optional(),
});

const env = envSchema.parse(process.env);

export default Object.freeze({
  discordBotToken: env.DISCORD_BOT_TOKEN,
  minLogLevel: env.LOG_LEVEL,
});
