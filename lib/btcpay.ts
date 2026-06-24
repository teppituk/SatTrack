// BTCPay Server (Lightning) integration

export interface BTCPayInvoice {
  id: string;
  checkoutLink: string;
  status?: string;
}

export function isBTCPayConfigured(): boolean {
  return !!(
    process.env.BTCPAY_URL &&
    process.env.BTCPAY_API_KEY &&
    process.env.BTCPAY_STORE_ID
  );
}

export async function createBTCPayInvoice(
  amountSats: number,
  orderId: string,
  buyerEmail: string
): Promise<BTCPayInvoice> {
  const btcPayUrl = process.env.BTCPAY_URL;
  const apiKey = process.env.BTCPAY_API_KEY;
  const storeId = process.env.BTCPAY_STORE_ID;

  if (!btcPayUrl || !apiKey || !storeId) {
    throw new Error("BTCPay Server is not configured");
  }

  const response = await fetch(`${btcPayUrl}/api/v1/stores/${storeId}/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${apiKey}`,
    },
    body: JSON.stringify({
      amount: amountSats,
      currency: "SATS",
      metadata: { orderId, buyerEmail },
      checkout: {
        paymentMethods: ["BTC-LightningNetwork", "BTC"],
        expirationMinutes: 60,
        redirectURL: `${process.env.NEXTAUTH_URL}/settings/subscription?status=success`,
        redirectAutomatically: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`BTCPay API error: ${error}`);
  }

  return response.json();
}

// ดึงสถานะ invoice เพื่อ verify การชำระเงิน (ใช้ตอน redirect กลับ หรือ reconcile)
export async function getBTCPayInvoice(
  invoiceId: string
): Promise<{ id: string; status: string } | null> {
  const btcPayUrl = process.env.BTCPAY_URL;
  const apiKey = process.env.BTCPAY_API_KEY;
  const storeId = process.env.BTCPAY_STORE_ID;

  if (!btcPayUrl || !apiKey || !storeId) return null;

  const res = await fetch(
    `${btcPayUrl}/api/v1/stores/${storeId}/invoices/${invoiceId}`,
    { headers: { Authorization: `token ${apiKey}` } }
  );
  if (!res.ok) return null;
  return res.json();
}

// สถานะที่ถือว่าจ่ายเงินสำเร็จแล้ว
export const SETTLED_STATUSES = ["Settled", "Complete", "Confirmed"];
