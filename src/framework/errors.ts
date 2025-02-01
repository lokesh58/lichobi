import { LichobiCommandType } from "./command/index.js";

export class LichobiError extends Error {
  public displayMessage(): string {
    return "🐛 Something went wrong, please try again later!";
  }
}

export class UnexpectedError extends LichobiError {
  constructor(cause: unknown) {
    super(`Unexpected Error: ${cause}`, { cause });
  }
}

export class UnknownCommandError extends LichobiError {
  constructor(commandId: string, name: string, type: LichobiCommandType) {
    super(`Unknown command: ${name} (${commandId}) of type ${type}`);
  }
}
