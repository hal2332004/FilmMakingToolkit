export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "cmd";
  module: "SYSTEM" | "OPENAI" | "ELEVENLABS" | "FFMPEG" | "API";
  message: string;
  metadata?: any;
}

// In-memory global buffer for logs across API calls
declare global {
  var __SERVER_LOGS__: LogEntry[] | undefined;
}

if (!global.__SERVER_LOGS__) {
  global.__SERVER_LOGS__ = [
    {
      id: "init-1",
      timestamp: new Date().toLocaleTimeString("vi-VN"),
      level: "info",
      module: "SYSTEM",
      message: "🚀 AI Video Studio Server đã sẵn sàng tiếp nhận yêu cầu.",
    },
  ];
}

export function addLog(
  module: LogEntry["module"],
  message: string,
  level: LogEntry["level"] = "info",
  metadata?: any
) {
  const timestamp = new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    level,
    module,
    message,
    metadata,
  };

  // Log to standard terminal / CMD console
  const prefix = `[${timestamp}] [${module}] [${level.toUpperCase()}]`;
  if (level === "error") {
    console.error(`${prefix} ${message}`, metadata || "");
  } else if (level === "warn") {
    console.warn(`${prefix} ${message}`, metadata || "");
  } else {
    console.log(`${prefix} ${message}`);
  }

  // Push to server-side buffer (limit 300 entries)
  const logs = global.__SERVER_LOGS__ || [];
  logs.push(entry);
  if (logs.length > 300) {
    logs.shift();
  }
  global.__SERVER_LOGS__ = logs;

  return entry;
}

export function getLogs(): LogEntry[] {
  return global.__SERVER_LOGS__ || [];
}

export function clearLogs(): void {
  global.__SERVER_LOGS__ = [
    {
      id: `${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("vi-VN"),
      level: "info",
      module: "SYSTEM",
      message: "🧹 Nhật ký CMD đã được làm trống.",
    },
  ];
}

