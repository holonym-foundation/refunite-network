import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipient } = body;

    if (!recipient) {
      return NextResponse.json({ error: "Recipient address is required" }, { status: 400 });
    }

    const defenderWebhookUrl = process.env.DEFENDER_WEBHOOK_URL;
    if (!defenderWebhookUrl) {
      return NextResponse.json({ error: "Defender webhook URL not configured" }, { status: 500 });
    }

    const response = await fetch(defenderWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient }),
    });

    if (!response.ok) {
      throw new Error(`Defender webhook responded with status ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.result);

    return NextResponse.json({
      mintHatTxHash: result.mintHatTxHash,
      claimSignerTxHash: result.claimSignerTxHash,
    });
  } catch (error) {
    console.error("Error in defender webhook:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
