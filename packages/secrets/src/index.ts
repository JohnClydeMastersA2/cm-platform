import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

export interface EmailSmtpCredentials {
  user: string;
  password: string;
}

// process.env is Node’s in-memory map of environment variables for the current running process.
//
// dotenv mutates process.env, so load the local secrets file at most once per process.
// Future secret getters can all call loadLocalSecrets without repeatedly parsing the file.
//
let localSecretsLoaded = false;

export function getEmailSmtpCredentials(): EmailSmtpCredentials {
  loadLocalSecrets();

  return {
    user: requiredEnv("EMAIL_SMTP_USER"),
    password: requiredEnv("EMAIL_SMTP_PASS"),
  };
}

function loadLocalSecrets(): void {
  if (localSecretsLoaded) {
    return;
  }

  const path = resolve(dirname(fileURLToPath(import.meta.url)), "../cm-platform.env");

  if (existsSync(path)) {
    const result = loadDotenv({ path });

    if (result.error) {
      throw result.error;
    }
  }

  localSecretsLoaded = true;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }

  return value;
}
