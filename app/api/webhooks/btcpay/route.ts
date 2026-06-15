import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function verifyBTCPayWebhook(payload: string, signature: string, secret: string): boolean {
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.BTCPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("BTCPay webhook secret not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("btcpay-sig") || "";
  const rawBody = await request.text();

  // Extract hex portion if it has a hash prefix
  const sigHex = signature.includes("=") ? signature.split("=")[1] : signature;

  if (!verifyBTCPayWebhook(rawBody, sigHex, webhookSecret)) {
    console.warn("Invalid BTCPay webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    type: string;
    invoiceId: string;
    metadata?: {
      orderId?: string;
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("BTCPay webhook event:", event.type, event.invoiceId);

  if (event.type === "InvoiceSettled" || event.type === "InvoicePaymentSettled") {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: { invoiceId: event.invoiceId },
        include: { user: true },
      });

      if (!subscription) {
        console.warn("No subscription found for invoice:", event.invoiceId);
        return NextResponse.json({ received: true });
      }

      if (subscription.status === "paid") {
        return NextResponse.json({ received: true, note: "Already processed" });
      }

      // Determine plan duration from amount
      const durationDays = subscription.amountSats >= 100000 ? 365 : 30;
      const planExpiresAt = new Date();
      planExpiresAt.setDate(planExpiresAt.getDate() + durationDays);

      await Promise.all([
        prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "paid",
            paidAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: subscription.userId },
          data: {
            plan: "paid",
            planExpiresAt,
          },
        }),
      ]);

      console.log(
        `Subscription activated for user ${subscription.userId}, expires ${planExpiresAt}`
      );
    } catch (error) {
      console.error("Webhook processing error:", error);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  if (event.type === "InvoiceExpired" || event.type === "InvoiceInvalid") {
    await prisma.subscription
      .updateMany({
        where: { invoiceId: event.invoiceId, status: "pending" },
        data: { status: "expired" },
      })
      .catch(console.error);
  }

  return NextResponse.json({ received: true });
}
