import chalk, { ChalkInstance } from "chalk";
import { format } from "node:util";

export const LogLevels = Object.freeze([
  "debug",
  "info",
  "warn",
  "error",
] as const);

type LogLevel = (typeof LogLevels)[number];

const LogSeverity = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const satisfies Record<LogLevel, number>;

type LogSeverity = (typeof LogSeverity)[LogLevel];

export type LoggerOptions = {
  minLogLevel?: LogLevel | number;
};

export class Logger {
  public minLogSeverity: number;

  private static readonly LogColors = Object.freeze({
    [LogSeverity.debug]: chalk.gray,
    [LogSeverity.info]: chalk.cyan,
    [LogSeverity.warn]: chalk.yellow,
    [LogSeverity.error]: chalk.red,
  }) satisfies Record<LogSeverity, ChalkInstance>;

  constructor(options?: LoggerOptions) {
    const { minLogLevel = LogSeverity.info } = options ?? {};
    this.minLogSeverity =
      typeof minLogLevel === "string" ? LogSeverity[minLogLevel] : minLogLevel;
  }

  public error(...args: unknown[]): void {
    this.writeLog(LogSeverity.error, ...args);
  }

  public warn(...args: unknown[]): void {
    this.writeLog(LogSeverity.warn, ...args);
  }

  public info(...args: unknown[]): void {
    this.writeLog(LogSeverity.info, ...args);
  }

  public debug(...args: unknown[]): void {
    this.writeLog(LogSeverity.debug, ...args);
  }

  private writeLog(severity: LogSeverity, ...args: unknown[]): void {
    if (severity < this.minLogSeverity) {
      return;
    }
    const logColor = Logger.LogColors[severity];
    const logPrefix = `${new Date().toISOString()} ${this.getCallerFile()}`;
    const formattedMessage = format(...args);
    console.log(logColor(logPrefix, formattedMessage));
  }

  private getCallerFile(): string {
    return (
      new Error().stack?.split("\n")[4]?.replace(/.*\//g, "").slice(0, -1) ?? ""
    );
  }
}
