// สร้าง Lightning invoice (bolt11) จาก Lightning address ผ่าน LNURL-pay (LUD-16/LUD-12)
// ใช้ฝังจำนวน + memo ลงใน QR ให้ user สแกนแล้วจ่ายได้ทันที

export async function fetchLightningInvoice(
  address: string,
  amountSats: number,
  comment: string
): Promise<string> {
  const [name, domain] = address.trim().split("@");
  if (!name || !domain) throw new Error("Invalid Lightning address");

  // 1) LNURL-pay metadata
  const lnurl = `https://${domain}/.well-known/lnurlp/${encodeURIComponent(name)}`;
  const r1 = await fetch(lnurl, { cache: "no-store" });
  if (!r1.ok) throw new Error(`LNURL fetch failed (${r1.status})`);
  const meta = (await r1.json()) as {
    tag?: string;
    callback?: string;
    minSendable?: number;
    maxSendable?: number;
    commentAllowed?: number;
  };
  if (meta.tag !== "payRequest" || !meta.callback) {
    throw new Error("Invalid LNURL-pay response");
  }

  const amountMsat = Math.round(amountSats * 1000);
  if (meta.minSendable && amountMsat < meta.minSendable) {
    throw new Error("Amount below minimum");
  }
  if (meta.maxSendable && amountMsat > meta.maxSendable) {
    throw new Error("Amount above maximum");
  }

  // 2) ขอ invoice (ฝัง comment = memo ถ้ารองรับ)
  const url = new URL(meta.callback);
  url.searchParams.set("amount", String(amountMsat));
  if (typeof meta.commentAllowed === "number" && meta.commentAllowed >= comment.length) {
    url.searchParams.set("comment", comment);
  }
  const r2 = await fetch(url.toString(), { cache: "no-store" });
  if (!r2.ok) throw new Error(`Invoice fetch failed (${r2.status})`);
  const inv = (await r2.json()) as { pr?: string; status?: string; reason?: string };
  if (inv.status === "ERROR" || !inv.pr) {
    throw new Error(inv.reason || "No invoice returned");
  }
  return inv.pr; // bolt11
}

// อ่านเวลาหมดอายุของ bolt11 invoice → epoch ms (คืน null ถ้าถอดรหัสไม่ได้)
export function getInvoiceExpiry(bolt11: string): number | null {
  try {
    const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    const sep = bolt11.lastIndexOf("1");
    if (sep < 0) return null;
    const data = bolt11.slice(sep + 1, -6); // ตัด checksum 6 ตัวท้าย
    const v: number[] = [];
    for (const c of data) {
      const idx = CHARSET.indexOf(c.toLowerCase());
      if (idx < 0) return null;
      v.push(idx);
    }
    if (v.length < 7) return null;
    let ts = 0;
    for (let i = 0; i < 7; i++) ts = ts * 32 + v[i]; // timestamp = 7 symbols แรก (35 bit)
    let i = 7;
    let expiry = 3600; // ค่า default ตาม BOLT11
    while (i + 3 <= v.length) {
      const type = v[i];
      const len = v[i + 1] * 32 + v[i + 2];
      const start = i + 3;
      if (start + len > v.length) break;
      if (type === 6) {
        // tag 'x' = expiry (วินาที)
        let e = 0;
        for (let k = 0; k < len; k++) e = e * 32 + v[start + k];
        expiry = e;
      }
      i = start + len;
    }
    return (ts + expiry) * 1000;
  } catch {
    return null;
  }
}
