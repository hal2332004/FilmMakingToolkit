import { NextRequest, NextResponse } from "next/server";
import { getLogs, clearLogs } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs = getLogs();
  return NextResponse.json({ logs });
}

export async function DELETE() {
  clearLogs();
  return NextResponse.json({ success: true, message: "Logs cleared" });
}

