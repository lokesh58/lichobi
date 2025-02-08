import { Colors, EmbedBuilder } from "discord.js";
import { LichobiError, UnexpectedError } from "../errors.js";

export class ErrorUtility {
  public static generateErrorEmbed(rawError: unknown): EmbedBuilder {
    const error =
      rawError instanceof LichobiError
        ? rawError
        : new UnexpectedError(rawError);
    return new EmbedBuilder()
      .setDescription(error.displayMessage())
      .setColor(Colors.Red);
  }
}
