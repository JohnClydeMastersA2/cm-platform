import pino, {
  type Logger,
  type LoggerOptions,
  type TransportSingleOptions,
} from "pino";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type AppLoggerOptions = {
  name: string;
  level?: string;
  env?: string;
  logFilePath?: string;
};

function ensureParentDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

function buildTransport(
  opts: AppLoggerOptions,
): TransportSingleOptions | undefined {
  const env = opts.env ?? process.env.NODE_ENV ?? "development";

  if (opts.logFilePath) {
    const fullPath = resolve(opts.logFilePath);
    ensureParentDir(fullPath);

    return {
      target: "pino-pretty",
      options: {
        destination: fullPath,
        mkdir: true,
        colorize: false,
        translateTime: "SYS:standard",
        singleLine: true,
        messageFormat: "{msg}",
        ignore: "pid,hostname",
      },
    };
  }

  if (env !== "production") {
    return {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    };
  }

  return undefined;
}

export function createLogger(opts: AppLoggerOptions): Logger {
  const loggerOptions: LoggerOptions = {
    name: opts.name,
    level: opts.level ?? "info",
    base: {
      app: opts.name,
    },
  };

  const transport = buildTransport(opts);

  if (transport) {
    return pino(loggerOptions, pino.transport(transport));
  }

  return pino(loggerOptions);
}

export type { Logger };