import { ApplicationCommandType } from "discord.js";

export class LichobiError extends Error {}

export class UserDisplayableError extends LichobiError {}

export class UnknownCommandError extends LichobiError {
  constructor(commandId: string, name: string, type: ApplicationCommandType) {
    super(
      `Unknown application command '${name}', id: '${commandId}', type: '${type}'.`,
    );
  }
}
