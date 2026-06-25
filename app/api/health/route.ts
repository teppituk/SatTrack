import { NextResponse } from "next/server";

// Lightweight liveness probe for load balancers / monitoring.
// Does NOT touch the DB so it stays cheap and always-available.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", time: new Date().toISOString() });
}
