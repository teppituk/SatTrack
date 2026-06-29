// รูปแบบเทรดมาตรฐานหลัง normalize จากทุก exchange
export interface NormalizedTrade {
  externalId: string; // id เฉพาะของเทรดนั้นจาก exchange (กันซ้ำ)
  type: "BUY" | "SELL";
  amount: number; // จำนวน BTC
  price: number; // ราคาต่อหน่วย (ในสกุล currency)
  totalValue: number; // มูลค่ารวม (ในสกุล currency)
  currency: string; // THB | USDT | USD
  txDate: Date;
}

export interface TestResult {
  ok: boolean;
  error?: string;
}

// connector แต่ละ exchange ต้อง implement interface นี้
export interface ExchangeConnector {
  code: string; // bitkub | binance | binanceth
  name: string;
  // ทดสอบว่า key ใช้ได้ (เรียก endpoint เบา ๆ ที่ต้องยืนยันตัวตน)
  testConnection(apiKey: string, apiSecret: string): Promise<TestResult>;
  // ดึงเทรด BTC (incremental ตั้งแต่ sinceMs ถ้ามี)
  fetchBtcTrades(
    apiKey: string,
    apiSecret: string,
    sinceMs?: number
  ): Promise<NormalizedTrade[]>;
}
