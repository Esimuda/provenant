import { mintPlan } from "@provenant/core";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const plan = mintPlan(Boolean(body.collectionId));
  const relayer = process.env.RELAYER_URL;
  if (!relayer) return NextResponse.json({ mode: "plan", plan, submitted: false });
  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (process.env.RELAYER_TOKEN) headers["x-provenant-token"] = process.env.RELAYER_TOKEN;
    const response = await fetch(`${relayer}/prepare/mint`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) return NextResponse.json({ mode: "plan", plan, relayerError: payload.error, submitted: false });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({
      mode: "plan",
      plan,
      submitted: false,
      relayerError: error instanceof Error ? error.message : "relayer unreachable",
    });
  }
}
