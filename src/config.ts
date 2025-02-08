import z from "zod";
import { LogLevels } from "#lichobi/framework";

const envSchema = z.object({
  CODE_RUNNER_API_BASE_URL: z.string(),
  CODE_RUNNER_API_TOKEN: z.string(),
  DEFAULT_PREFIX: z.string().optional(),
  DEV_GUILD_ID: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string(),
  LOG_LEVEL: z.enum(LogLevels).optional(),
});

const env = envSchema.parse(process.env);

export default Object.freeze({
  codeRunnerApiBaseUrl: env.CODE_RUNNER_API_BASE_URL,
  codeRunnerApiToken: env.CODE_RUNNER_API_TOKEN,
  defaultPrefix: env.DEFAULT_PREFIX,
  devGuildId: env.DEV_GUILD_ID,
  discordBotToken: env.DISCORD_BOT_TOKEN,
  minLogLevel: env.LOG_LEVEL,
});
