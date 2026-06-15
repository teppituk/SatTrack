import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ParsedSlipData {
  exchange: "bitkub" | "binanceth" | "binance" | "unknown";
  type: "BUY" | "SELL";
  coinSymbol: string;
  amount: number;
  price: number;
  totalValue: number;
  currency: "THB" | "USDT" | "USD";
  txDate: string; // ISO date string
  txId?: string;
  fee?: number;
  confidence: number; // 0-1 confidence score
  rawText?: string;
}

const SLIP_PARSE_PROMPT = `You are an expert at reading cryptocurrency trading slips from Thai exchanges.
Analyze this trading slip image and extract the transaction details.

Extract the following information:
1. Exchange: Identify if this is from Bitkub, Binance TH (Thailand), or Binance international
2. Transaction type: BUY or SELL
3. Cryptocurrency symbol (e.g., BTC, ETH, BNB, etc.)
4. Amount of cryptocurrency traded
5. Price per unit (in THB or USDT)
6. Total transaction value
7. Currency (THB or USDT)
8. Transaction date and time
9. Transaction ID (if visible)
10. Fee (if visible)

For Bitkub slips: prices are usually in THB
For Binance TH slips: prices may be in THB or USDT
For Binance international: prices are usually in USDT

Respond with a JSON object in this exact format:
{
  "exchange": "bitkub" | "binanceth" | "binance" | "unknown",
  "type": "BUY" | "SELL",
  "coinSymbol": "BTC",
  "amount": 0.001,
  "price": 2000000,
  "totalValue": 2000,
  "currency": "THB" | "USDT" | "USD",
  "txDate": "2024-01-15T10:30:00Z",
  "txId": "optional-transaction-id",
  "fee": 10,
  "confidence": 0.95,
  "rawText": "key text you found in the image"
}

If you cannot determine a value with confidence, use null for that field.
The confidence score should reflect how certain you are about the extracted data (0=not confident, 1=very confident).`;

export async function parseSlipImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<ParsedSlipData> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: SLIP_PARSE_PROMPT,
          },
        ],
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not extract JSON from Claude response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as ParsedSlipData;

  // Validate required fields
  if (!parsed.type || !parsed.coinSymbol) {
    throw new Error("Missing required fields in parsed slip data");
  }

  return parsed;
}

export async function parseSlipFromUrl(imageUrl: string): Promise<ParsedSlipData> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "url",
              url: imageUrl,
            },
          },
          {
            type: "text",
            text: SLIP_PARSE_PROMPT,
          },
        ],
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not extract JSON from Claude response");
  }

  return JSON.parse(jsonMatch[0]) as ParsedSlipData;
}
