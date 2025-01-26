export class LichobiError extends Error {}

export class UserDisplayableError extends LichobiError {
  constructor(message: string) {
    super(message);
    this.name = "UserDisplayableError";
  }
}
