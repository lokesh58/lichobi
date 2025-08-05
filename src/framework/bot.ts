import { Client, ClientOptions, Events } from "discord.js";
import { ChatManager, ChatManagerOptions } from "./chatManager/index.js";
import {
  CommandManager,
  CommandManagerOptions,
} from "./commandManager/index.js";
import { LichobiError } from "./errors.js";
import { EventManager } from "./eventManager/index.js";
import { Logger, LoggerOptions } from "./logger.js";
import { PrefixManager, PrefixManagerOptions } from "./prefixManager/index.js";

export type BotOptions = {
  clientOptions: ClientOptions;
  loggerOptions?: LoggerOptions;
  prefixManagerOptions: PrefixManagerOptions;
  commandManagerOptions: CommandManagerOptions;
  chatManagerOptions: ChatManagerOptions;
};

export class Bot<Ready extends boolean = boolean> {
  public readonly client: Client<Ready>;
  public readonly logger: Logger;
  public readonly prefixManager: PrefixManager;
  public readonly commandManager: CommandManager;
  public readonly chatManager: ChatManager;
  public readonly eventManager: EventManager;

  private ready: boolean = false;

  constructor(options: BotOptions) {
    this.client = new Client(options.clientOptions);
    this.logger = new Logger(options.loggerOptions);
    this.prefixManager = new PrefixManager(
      this as Bot<true>,
      options.prefixManagerOptions,
    );
    this.commandManager = new CommandManager(
      this as Bot<true>,
      options.commandManagerOptions,
    );
    this.chatManager = new ChatManager(
      this as Bot<true>,
      options.chatManagerOptions,
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
      this.chatManager.loadChatParticipants(),
      this.client.login(token),
      clientReadyPromise,
    ]);

    if (!this.client.isReady()) {
      throw new LichobiError("Client failed to become ready!");
    }

    await this.commandManager.registerCommandsOnDiscord();
    this.commandManager.startCommandHandlers();
    this.chatManager.startChatHandler();

    this.ready = true;
    this.logger.info(`Ready! Logged in as ${this.client.user.tag}`);
  }
}
