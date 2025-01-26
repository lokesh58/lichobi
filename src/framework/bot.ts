import { Client, ClientOptions } from "discord.js";
import { Logger, LoggerOptions } from "./logger.js";
import {
  CommandManager,
  CommandManagerOptions,
} from "./commandManager/index.js";

export type BotOptions = {
  clientOptions: ClientOptions;
  loggerOptions?: LoggerOptions;
  commandManagerOptions: CommandManagerOptions;
};

export class Bot<Ready extends boolean = boolean> {
  public readonly client: Client<Ready>;
  public readonly logger: Logger;
  public readonly commandManager: CommandManager;

  constructor(options: BotOptions) {
    this.client = new Client(options.clientOptions);
    this.logger = new Logger(options.loggerOptions);
    this.commandManager = new CommandManager(
      this as Bot<true>,
      options.commandManagerOptions,
    );
  }

  public isReady(): this is Bot<true> {
    return this.client.isReady();
  }

  public async bootUp(token: string): Promise<void> {
    // Logging setup
    this.client.on("debug", (message) => this.logger.debug(message));
    this.client.on("warn", (message) => this.logger.warn(message));
    this.client.on("error", (message) => this.logger.error(message));

    // Command Manager setup
    await this.commandManager.init();
    this.commandManager.startCommandHandlers();

    // Login
    await this.client.login(token);
  }
}
