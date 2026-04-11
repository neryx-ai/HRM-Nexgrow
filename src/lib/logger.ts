type LogLevel = "info" | "warn" | "error" | "debug";

const LOG_COLORS: Record<LogLevel, string> = {
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  debug: "\x1b[90m",
};

const RESET = "\x1b[0m";

function formatTimestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, context: string, message: string, data?: unknown) {
  const timestamp = formatTimestamp();
  const prefix = `${LOG_COLORS[level]}[${timestamp}] [${level.toUpperCase()}] [${context}]${RESET}`;

  if (data !== undefined) {
    console[level === "debug" ? "log" : level](prefix, message, data);
  } else {
    console[level === "debug" ? "log" : level](prefix, message);
  }
}

export const logger = {
  info: (context: string, message: string, data?: unknown) => log("info", context, message, data),
  warn: (context: string, message: string, data?: unknown) => log("warn", context, message, data),
  error: (context: string, message: string, data?: unknown) => log("error", context, message, data),
  debug: (context: string, message: string, data?: unknown) => log("debug", context, message, data),
};
