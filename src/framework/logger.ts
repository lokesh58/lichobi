import chalk, { ChalkInstance } from "chalk";
import { format } from "node:util";

export const LOG_LEVELS = Object.freeze([
  "debug",
  "info",
  "warn",
  "error",
] as const);

type LogLevels = (typeof LOG_LEVELS)[number];

const LOG_SEVERITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const satisfies Record<LogLevels, number>;

type LogSeverity = (typeof LOG_SEVERITY)[LogLevels];

export type LoggerOptions = {
  minLogLevel?: LogLevels | number;
};

export class Logger {
  public minLogSeverity: number;

  private static readonly LOG_COLORS = Object.freeze({
    [LOG_SEVERITY.debug]: chalk.gray,
    [LOG_SEVERITY.info]: chalk.cyan,
    [LOG_SEVERITY.warn]: chalk.yellow,
    [LOG_SEVERITY.error]: chalk.red,
  }) satisfies Record<LogSeverity, ChalkInstance>;

  constructor(options?: LoggerOptions) {
    const { minLogLevel = LOG_SEVERITY.info } = options ?? {};
    this.minLogSeverity =
      typeof minLogLevel === "string" ? LOG_SEVERITY[minLogLevel] : minLogLevel;
  }

  public error(...args: unknown[]): void {
    this.writeLog(LOG_SEVERITY.error, ...args);
  }

  public warn(...args: unknown[]): void {
    this.writeLog(LOG_SEVERITY.warn, ...args);
  }

  public info(...args: unknown[]): void {
    this.writeLog(LOG_SEVERITY.info, ...args);
  }

  public debug(...args: unknown[]): void {
    this.writeLog(LOG_SEVERITY.debug, ...args);
  }

  private writeLog(severity: LogSeverity, ...args: unknown[]): void {
    if (severity < this.minLogSeverity) {
      return;
    }
    const logColor = Logger.LOG_COLORS[severity];
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
