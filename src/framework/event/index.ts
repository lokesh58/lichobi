import { Awaitable, ClientEvents } from "discord.js";

export type LichobiEventData<Event extends keyof ClientEvents> = {
  name: string;
  event: Event;
  once?: boolean;
  handler: (...args: ClientEvents[Event]) => Awaitable<void>;
  customErrorHandler?: (error: unknown, args: ClientEvents[Event]) => void;
};

export class LichobiEventListener<Event extends keyof ClientEvents> {
  private readonly data: LichobiEventData<Event>;

  constructor(data: LichobiEventData<Event>) {
    this.data = data;
  }

  public get name(): string {
    return this.data.name;
  }

  public get event(): Event {
    return this.data.event;
  }

  public get once(): boolean {
    return this.data.once ?? false;
  }

  public get handler(): (...args: ClientEvents[Event]) => Awaitable<void> {
    return this.data.handler;
  }

  public get customErrorHandler():
    | ((error: unknown, args: ClientEvents[Event]) => void)
    | undefined {
    return this.data.customErrorHandler;
  }
}

export function LichobiEvent<Event extends keyof ClientEvents>(
  data: LichobiEventData<Event>,
): LichobiEventListener<Event> {
  return new LichobiEventListener(data);
}
