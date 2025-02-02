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

export class InvalidCommandError extends LichobiError {
  private commandName: string;

  constructor(commandName: string) {
    super(`Invalid command used: ${commandName}`);
    this.commandName = commandName;
  }

  public override displayMessage(): string {
    return `❌ Invalid command: \`${this.commandName}\``;
  }
}
