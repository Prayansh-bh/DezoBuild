import { RequestContext } from "../context/request-context";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITIES: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "jwtsecret",
  "authorization",
  "cookie",
  "apikey",
  "apikeysecret",
  "creditcard",
  "cardnumber",
  "cvv",
  "pin",
]);

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module?: string | undefined;
  requestId?: string | undefined;
  correlationId?: string | undefined;
  durationMs?: number | undefined;
  context?: Record<string, unknown> | undefined;
  error?: {
    name: string;
    message: string;
    stack?: string | undefined;
  } | undefined;
}

export class Logger {
  private readonly moduleName: string;
  private currentLogLevel: LogLevel = "info";
  private logFormat: "json" | "pretty" = "json";

  constructor(moduleName = "App") {
    this.moduleName = moduleName;
    const envLevel = process.env["LOG_LEVEL"] as LogLevel;
    if (envLevel && LOG_LEVEL_PRIORITIES[envLevel] !== undefined) {
      this.currentLogLevel = envLevel;
    }
    if (process.env["LOG_FORMAT"] === "pretty") {
      this.logFormat = "pretty";
    }
  }

  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  public setLogFormat(format: "json" | "pretty"): void {
    this.logFormat = format;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITIES[level] >= LOG_LEVEL_PRIORITIES[this.currentLogLevel];
  }

  private sanitize(obj: unknown, depth = 0): unknown {
    if (depth > 5 || obj === null || obj === undefined) return obj;
    if (typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item, depth + 1));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase().replace(/[-_]/g, "");
      if (SENSITIVE_KEYS.has(lowerKey)) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitize(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private write(level: LogLevel, message: string, context?: Record<string, unknown>, err?: Error): void {
    if (!this.shouldLog(level)) return;

    const reqCtx = RequestContext.current();
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      module: this.moduleName,
      requestId: reqCtx?.requestId,
      correlationId: reqCtx?.correlationId,
    };

    if (reqCtx?.startTime) {
      entry.durationMs = Date.now() - reqCtx.startTime;
    }

    if (context) {
      entry.context = this.sanitize(context) as Record<string, unknown>;
    }

    if (err) {
      entry.error = {
        name: err.name,
        message: err.message,
        // Only include stack trace if not in production or for error level debugging
        stack: process.env["NODE_ENV"] !== "production" ? err.stack : undefined,
      };
    }

    if (this.logFormat === "pretty") {
      const color = level === "error" ? "\x1b[31m" : level === "warn" ? "\x1b[33m" : level === "debug" ? "\x1b[36m" : "\x1b[32m";
      const reset = "\x1b[0m";
      const reqInfo = entry.requestId ? ` [Req: ${entry.requestId.slice(0, 8)}]` : "";
      console.log(`${color}[${entry.timestamp}] [${level.toUpperCase()}] [${this.moduleName}]${reqInfo}${reset} ${message}`);
      if (context) console.log(JSON.stringify(entry.context, null, 2));
      if (err && process.env["NODE_ENV"] !== "production") console.error(err.stack);
    } else {
      const stream = level === "error" ? process.stderr : process.stdout;
      stream.write(JSON.stringify(entry) + "\n");
    }
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.write("debug", message, context);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.write("info", message, context);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.write("warn", message, context);
  }

  public error(message: string, errOrContext?: Error | Record<string, unknown>, context?: Record<string, unknown>): void {
    if (errOrContext instanceof Error) {
      this.write("error", message, context, errOrContext);
    } else {
      this.write("error", message, errOrContext);
    }
  }
}

export const logger = new Logger("System");
