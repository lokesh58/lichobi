import { Client, ClientOptions } from "discord.js";
import { Logger, LoggerOptions } from "./logger.js";

export type BotOptions = {
  clientOptions: ClientOptions;
  loggerOptions?: LoggerOptions;
};

export class Bot {
  public readonly client: Client;
  public readonly logger: Logger;

  constructor(options: BotOptions) {
    this.client = new Client(options.clientOptions);
    this.logger = new Logger(options.loggerOptions);
  }

  public async bootUp(token: string): Promise<void> {
    this.client.on("debug", (message) => this.logger.debug(message));
    await this.client.login(token);
  }
}
