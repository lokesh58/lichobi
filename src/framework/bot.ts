import { Client, ClientOptions, Events } from "discord.js";
import {
  CommandManager,
  CommandManagerOptions,
} from "./commandManager/index.js";
import { Logger, LoggerOptions } from "./logger.js";

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
    this.client.on(Events.Debug, (message) => this.logger.debug(message));
    this.client.on(Events.Warn, (message) => this.logger.warn(message));
    this.client.on(Events.Error, (error) => this.logger.error(error));

    // Login
    await this.client.login(token);

    // Post login setup
    this.client.once(Events.ClientReady, async (readyClient) => {
      await this.commandManager.init();
      this.commandManager.startCommandHandlers();
      this.logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
    });
  }
}
