import { Client, ClientOptions, Events } from "discord.js";
import {
  CommandManager,
  CommandManagerOptions,
} from "./commandManager/index.js";
import { LichobiError } from "./errors.js";
import { EventManager } from "./eventManager/index.js";
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
  public readonly eventManager: EventManager;

  private ready: boolean = false;

  constructor(options: BotOptions) {
    this.client = new Client(options.clientOptions);
    this.logger = new Logger(options.loggerOptions);
    this.commandManager = new CommandManager(
      this as Bot<true>,
      options.commandManagerOptions,
    );
    this.eventManager = new EventManager(this as Bot<true>);
  }

  public isReady(): this is Bot<true> {
    return this.ready;
  }

  public async bootUp(token: string): Promise<void> {
    this.client.on(Events.Debug, (message) => this.logger.debug(message));
    this.client.on(Events.Warn, (message) => this.logger.warn(message));
    this.client.on(Events.Error, (error) => this.logger.error(error));

    const clientReadyPromise = new Promise<void>((resolve) => {
      this.client.once(Events.ClientReady, () => resolve());
    });
    await Promise.all([
      this.commandManager.loadCommands(),
      this.client.login(token),
      clientReadyPromise,
    ]);

    if (!this.client.isReady()) {
      throw new LichobiError("Client failed to become ready!");
    }

    await this.commandManager.registerCommandsOnDiscord();
    this.commandManager.startCommandHandlers();

    this.ready = true;
    this.logger.info(`Ready! Logged in as ${this.client.user.tag}`);
  }
}
