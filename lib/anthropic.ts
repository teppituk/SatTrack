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

const SLIP_PARSE_PROMPT = `You are an expert at reading cryptocurrency trading slips from Thai exchanges (Bitkub, Binance TH, Binance).

## Bitkub slip field mappings (Thai → JSON field):
- "ข้อมูลการซื้อเหรียญ" or "ข้อมูลการขายเหรียญ" → header indicating BUY or SELL
- The large number with "+" prefix (e.g. "+0.00007581") → amount of crypto received/sold
- "เหรียญ" → coinSymbol (e.g. BTC, ETH, KUB)
- "ประเภทรายการ: ซื้อเหรียญ" → type: "BUY"
- "ประเภทรายการ: ขายเหรียญ" → type: "SELL"
- "ราคาที่จับคู่" → price per unit (remove commas, extract number only, e.g. "2,140,348.34 THB/BTC" → 2140348.34)
- "มูลค่าที่จับคู่" → totalValue (e.g. "162.67 THB" → 162.67)
- "วันที่จับคู่" → txDate (format: "15/06/2026 - 10:25:45" → "2026-06-15T10:25:45+07:00")
- "Internal TxID" → txId
- "ค่าธรรมเนียมการเทรด" → fee
- Currency is always THB for Bitkub

## Binance TH field mappings:
- Look for "Binance TH" branding
- Fields may be in Thai or English
- Currency may be THB or USDT

## Binance international field mappings:
- English language interface
- Currency usually USDT or USD

## Instructions:
1. Read ALL text in the image carefully
2. Remove commas from numbers (2,140,348.34 → 2140348.34)
3. For amount: use the crypto amount (NOT the THB value), remove "+" prefix
4. For txDate: convert to ISO 8601 format with Thai timezone (+07:00)
5. confidence: 0.95 if all fields found clearly, 0.7 if some fields uncertain

Respond with ONLY a valid JSON object, no explanation:
{
  "exchange": "bitkub",
  "type": "BUY",
  "coinSymbol": "BTC",
  "amount": 0.00007581,
  "price": 2140348.34,
  "totalValue": 162.67,
  "currency": "THB",
  "txDate": "2026-06-15T10:25:45+07:00",
  "txId": "6a2f70b94da1c6b22844a164m8a2qe",
  "fee": 0.41,
  "confidence": 0.95,
  "rawText": "key fields found"
}`;

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
