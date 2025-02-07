import { LichobiError } from "#lichobi/framework";
import config from "#root/config.js";

export type CodeRunnerParams = {
  language: string;
  code: string;
  input?: string | null;
};

export type CodeRunnerResult = {
  output: string;
  error: string;
};

export class CodeRunner {
  private static _instance: CodeRunner | undefined;

  private baseURL: string;
  private token: string;

  private constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  public static getInstance(): CodeRunner {
    if (!this._instance) {
      this._instance = new CodeRunner(
        config.codeRunnerApiBaseUrl,
        config.codeRunnerApiToken,
      );
    }
    return this._instance;
  }

  public async runCode(params: CodeRunnerParams): Promise<CodeRunnerResult> {
    const response = await fetch(`${this.baseURL}/api/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new LichobiError(
        `Failed to run code! Status ${response.status}: ${errorMessage}`,
      );
    }

    return await response.json();
  }
}
