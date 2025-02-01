import z from "zod";
import { LogLevels } from "#lichobi/framework";

const envSchema = z.object({
  DISCORD_BOT_TOKEN: z.string(),
  LOG_LEVEL: z.enum(LogLevels).optional(),
});

const env = envSchema.parse(process.env);

export default Object.freeze({
  discordBotToken: env.DISCORD_BOT_TOKEN,
  minLogLevel: env.LOG_LEVEL,
});
