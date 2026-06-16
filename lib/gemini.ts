import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ParsedSlipData {
  exchange: string;
  assetType: "CRYPTO" | "STOCK";
  type: "BUY" | "SELL";
  coinSymbol: string;
  amount: number;
  price: number;
  totalValue: number;
  currency: "THB" | "USDT" | "USD";
  txDate: string; // ISO 8601
  txId?: string;
  fee?: number;
  confidence: number; // 0-1
  rawText?: string;
}

const SLIP_PARSE_PROMPT = `You are an expert at reading trading slips from Thai brokers and crypto exchanges. You can read both stock (หุ้น) and cryptocurrency slips.

## Asset Type Detection:
- If the slip mentions stocks/shares (หุ้น, SET, MAI, หลักทรัพย์, KTBST, MBKet, Kasikorn, KGI, TISCO, SCB Securities, NYSE, NASDAQ, AAPL, PTT, KBANK etc.) → assetType: "STOCK"
- If the slip mentions crypto (BTC, ETH, KUB, Bitkub, Binance, เหรียญ, Crypto) → assetType: "CRYPTO"

## Stock Exchange Detection:
- SET/MAI Thai stocks → exchange: "set"
- KTBST broker → exchange: "ktbst"
- MBKet broker → exchange: "mbket"
- Kasikorn Securities (KKPS) → exchange: "kasikorn"
- KGI Securities → exchange: "kgi"
- TISCO Securities → exchange: "tisco"
- SCB Securities → exchange: "scbs"
- NYSE stocks → exchange: "nyse"
- NASDAQ stocks → exchange: "nasdaq"

## Stock Slip Fields (Thai brokers):
- Stock symbol/ticker → coinSymbol (e.g. PTT, KBANK, SCB, AAPL)
- จำนวนหุ้น / Volume / Quantity → amount (number of shares)
- ราคาต่อหุ้น / Price per share → price
- มูลค่า / Total amount → totalValue
- วันที่ / Date → txDate
- ซื้อ/Buy → type: "BUY", ขาย/Sell → type: "SELL"
- Currency: THB for Thai stocks, USD for US stocks

## Crypto Slip Fields (Bitkub):
- "ข้อมูลการซื้อเหรียญ" or "ข้อมูลการขายเหรียญ" → BUY or SELL
- Large number with "+" prefix (e.g. "+0.00007581") → amount
- "เหรียญ" → coinSymbol (BTC, ETH, KUB)
- "ราคาที่จับคู่" → price (remove commas: 2,140,348.34 → 2140348.34)
- "มูลค่าที่จับคู่" → totalValue
- "วันที่จับคู่" → txDate (format "15/06/2026 - 10:25:45" → "2026-06-15T10:25:45+07:00")
- exchange: "bitkub", currency: "THB"

## Binance TH: exchange: "binanceth", currency: THB or USDT
## Binance International: exchange: "binance", currency: USDT or USD

## Rules:
1. Remove commas from numbers
2. amount = number of shares (stocks) OR crypto quantity (NOT THB value)
3. txDate → ISO 8601 with +07:00 for Thai time
4. confidence: 0.95 if all clear, 0.7 if uncertain

Respond with ONLY valid JSON, no markdown:
{
  "exchange": "set",
  "assetType": "STOCK",
  "type": "BUY",
  "coinSymbol": "PTT",
  "amount": 100,
  "price": 35.50,
  "totalValue": 3550,
  "currency": "THB",
  "txDate": "2026-06-15T10:25:45+07:00",
  "fee": 10.65,
  "confidence": 0.95,
  "rawText": "key fields found"
}`;

function getClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

export async function parseSlipImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<ParsedSlipData> {
  const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType: mediaType,
      },
    },
    SLIP_PARSE_PROMPT,
  ]);

  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not extract JSON from Gemini response");

  const parsed = JSON.parse(jsonMatch[0]) as ParsedSlipData;
  if (!parsed.type || !parsed.coinSymbol) {
    throw new Error("Missing required fields in parsed slip data");
  }

  return parsed;
}

export async function parseSlipFromUrl(imageUrl: string): Promise<ParsedSlipData> {
  // Fetch image then parse as base64 (Gemini free tier doesn't support URL directly)
  const res = await fetch(imageUrl);
  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const mediaType = contentType.split(";")[0] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  return parseSlipImage(base64, mediaType);
}
