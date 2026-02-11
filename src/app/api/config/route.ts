import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL || "",
    gatewayToken: process.env.NEXT_PUBLIC_GATEWAY_TOKEN || "",
  });
}
