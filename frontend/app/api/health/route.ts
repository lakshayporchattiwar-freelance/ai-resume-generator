import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "ai-resume-generator-frontend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
}
