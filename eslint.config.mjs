import { includeIgnoreFile } from "@eslint/compat";
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import typescriptEslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

/**
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
  },
  includeIgnoreFile(gitignorePath),
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
  pluginJs.configs.recommended,
  ...typescriptEslint.configs.recommended,
  eslintConfigPrettier,
];
