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

export class UserDisplayableError extends LichobiError {
  constructor(message: string) {
    super(message);
  }

  public override displayMessage(): string {
    return `⚠️ ${this.message}`;
  }
}

export class UserInputError extends LichobiError {
  constructor(message: string) {
    super(message);
  }

  public override displayMessage(): string {
    return `❌ ${this.message}`;
  }
}

export class InvalidCommandError extends UserInputError {
  constructor(commandName: string) {
    super(`Invalid command: ${commandName}`);
  }
}
