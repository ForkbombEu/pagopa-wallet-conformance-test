import { resolve } from "path";

export type CliOptions = {
  fileIni?: string;
  credentialIssuerUri?: string;
  presentationAuthorizeUri?: string;
  credentialTypes?: string;
  timeout?: number;
  maxRetries?: number;
  logLevel?: string;
  logFile?: string;
  port?: number;
  saveCredential?: boolean;
};

type NormalizedOptionsResult = {
  options: CliOptions;
  errors: string[];
};

const optionAliases: Record<keyof CliOptions, string[]> = {
  fileIni: ["fileIni", "file-ini"],
  credentialIssuerUri: ["credentialIssuerUri", "credential-issuer-uri"],
  presentationAuthorizeUri: [
    "presentationAuthorizeUri",
    "presentation-authorize-uri",
  ],
  credentialTypes: ["credentialTypes", "credential-types"],
  timeout: ["timeout"],
  maxRetries: ["maxRetries", "max-retries"],
  logLevel: ["logLevel", "log-level"],
  logFile: ["logFile", "log-file"],
  port: ["port"],
  saveCredential: ["saveCredential", "save-credential"],
};

const truthyValues = new Set(["true", "1", "yes"]);
const falsyValues = new Set(["false", "0", "no"]);

const coerceBoolean = (
  value: unknown,
  optionName: string,
  errors: string[],
): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (truthyValues.has(normalized)) {
      return true;
    }
    if (falsyValues.has(normalized)) {
      return false;
    }
  }
  errors.push(`Invalid boolean value for ${optionName}.`);
  return undefined;
};

const coerceNumber = (
  value: unknown,
  optionName: string,
  errors: string[],
): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  errors.push(`Invalid numeric value for ${optionName}.`);
  return undefined;
};

const coerceString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map(String).join(",");
  }
  return String(value);
};

const getRawValue = (
  input: Record<string, unknown>,
  aliases: string[],
): unknown => {
  for (const alias of aliases) {
    if (alias in input) {
      return input[alias];
    }
  }
  return undefined;
};

export const normalizeCliOptions = (
  input: Record<string, unknown>,
): NormalizedOptionsResult => {
  const errors: string[] = [];

  const options: CliOptions = {
    fileIni: coerceString(getRawValue(input, optionAliases.fileIni)),
    credentialIssuerUri: coerceString(
      getRawValue(input, optionAliases.credentialIssuerUri),
    ),
    presentationAuthorizeUri: coerceString(
      getRawValue(input, optionAliases.presentationAuthorizeUri),
    ),
    credentialTypes: coerceString(
      getRawValue(input, optionAliases.credentialTypes),
    ),
    timeout: coerceNumber(
      getRawValue(input, optionAliases.timeout),
      "timeout",
      errors,
    ),
    maxRetries: coerceNumber(
      getRawValue(input, optionAliases.maxRetries),
      "max-retries",
      errors,
    ),
    logLevel: coerceString(getRawValue(input, optionAliases.logLevel)),
    logFile: coerceString(getRawValue(input, optionAliases.logFile)),
    port: coerceNumber(
      getRawValue(input, optionAliases.port),
      "port",
      errors,
    ),
    saveCredential: coerceBoolean(
      getRawValue(input, optionAliases.saveCredential),
      "save-credential",
      errors,
    ),
  };

  return { options, errors };
};

export const setEnvFromOptions = (
  options: CliOptions,
): NodeJS.ProcessEnv => {
  const env = { ...process.env };

  if (options.fileIni) {
    env.CONFIG_FILE_INI = resolve(process.cwd(), options.fileIni);
  }
  if (options.credentialIssuerUri) {
    env.CONFIG_CREDENTIAL_ISSUER_URI = options.credentialIssuerUri;
  }
  if (options.presentationAuthorizeUri) {
    env.CONFIG_PRESENTATION_AUTHORIZE_URI = options.presentationAuthorizeUri;
  }
  if (options.credentialTypes) {
    env.CONFIG_CREDENTIAL_TYPES = options.credentialTypes;
  }
  if (options.timeout !== undefined) {
    env.CONFIG_TIMEOUT = options.timeout.toString();
  }
  if (options.maxRetries !== undefined) {
    env.CONFIG_MAX_RETRIES = options.maxRetries.toString();
  }
  if (options.logLevel) {
    env.CONFIG_LOG_LEVEL = options.logLevel;
  }
  if (options.logFile) {
    env.CONFIG_LOG_FILE = options.logFile;
  }
  if (options.port !== undefined) {
    env.CONFIG_PORT = options.port.toString();
  }
  if (options.saveCredential !== undefined) {
    env.CONFIG_SAVE_CREDENTIAL = options.saveCredential.toString();
  }

  return env;
};
