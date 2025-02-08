import { LichobiError } from "#lichobi/framework";
import config from "#root/config.js";

export type CodeRunnerLanguageDetails = {
  language: string;
  display: string;
};

export type CodeRunnerParams = {
  language: string;
  code: string;
  input?: string;
};

export type CodeRunnerResult = {
  output: string;
  error: string;
};

export class CodeRunner {
  private static _instance: CodeRunner | undefined;

  private static readonly CacheTtlSeconds = 3600; // 1 hour

  private baseURL: string;
  private token: string;

  private languagesCache: {
    data: CodeRunnerLanguageDetails[] | null;
    timestampMs: number;
  } = { data: null, timestampMs: 0 };

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

  public async getSupportedLanguages(): Promise<CodeRunnerLanguageDetails[]> {
    if (
      this.languagesCache.data &&
      Date.now() - this.languagesCache.timestampMs <
        CodeRunner.CacheTtlSeconds * 1_000
    ) {
      return this.languagesCache.data;
    }

    const response = await fetch(`${this.baseURL}/api/list`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new LichobiError(
        `Failed to retrieve supported languages! Status ${response.status}: ${errorMessage}`,
      );
    }

    const data = await response.json();
    this.languagesCache = { data, timestampMs: Date.now() };
    return data;
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
