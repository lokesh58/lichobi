import {
  ClientEvents,
  Events,
  InteractionReplyOptions,
  MessageFlags,
} from "discord.js";
import { Bot } from "../bot.js";
import { LichobiEventListener } from "../event/index.js";
import { ErrorUtility } from "../utils/index.js";

export class EventManager {
  private readonly bot: Bot<true>;
  private readonly eventToErrorHandlerMap: Partial<{
    [Event in keyof ClientEvents]: (
      error: unknown,
      args: ClientEvents[Event],
    ) => void;
  }>;

  constructor(bot: Bot<true>) {
    this.bot = bot;
    this.eventToErrorHandlerMap = {
      [Events.InteractionCreate]: this.interactionCreateErrorHandler.bind(this),
    };
  }

  public registerEvent<Event extends keyof ClientEvents>(
    listener: LichobiEventListener<Event>,
  ): void {
    const wrappedHandler = this.getWrappedHandler(listener);
    if (listener.once) {
      this.bot.client.once(listener.event, wrappedHandler);
    } else {
      this.bot.client.on(listener.event, wrappedHandler);
    }
  }

  private getWrappedHandler<Event extends keyof ClientEvents>(
    listener: LichobiEventListener<Event>,
  ): (...args: ClientEvents[Event]) => Promise<void> {
    return async (...args) => {
      try {
        await listener.handler(...args);
      } catch (error) {
        this.bot.logger.error(
          `Error happened in listener ${listener.name}`,
          error,
        );
        const customErrorHandler =
          listener.customErrorHandler ||
          this.eventToErrorHandlerMap[listener.event];
        customErrorHandler?.(error, args);
      }
    };
  }

  private interactionCreateErrorHandler(
    error: unknown,
    args: ClientEvents[Events.InteractionCreate],
  ): void {
    const [interaction] = args;
    if (!interaction.isRepliable()) return;
    const response: InteractionReplyOptions = {
      embeds: [ErrorUtility.generateErrorEmbed(error)],
      flags: MessageFlags.Ephemeral,
    };
    if (interaction.deferred || interaction.replied) {
      interaction
        .followUp(response)
        .catch((reason) => this.bot.logger.error(reason));
    } else {
      interaction
        .reply(response)
        .catch((reason) => this.bot.logger.error(reason));
    }
  }
}
