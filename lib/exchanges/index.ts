import type { ExchangeConnector } from "./types";
import { bitkubConnector } from "./bitkub";

// registry ของ connector ที่รองรับ (Phase 1: Bitkub)
const CONNECTORS: Record<string, ExchangeConnector> = {
  bitkub: bitkubConnector,
};

export function getConnector(code: string): ExchangeConnector | null {
  return CONNECTORS[code] ?? null;
}

export function supportedExchanges(): { code: string; name: string }[] {
  return Object.values(CONNECTORS).map((c) => ({ code: c.code, name: c.name }));
}

export type { ExchangeConnector, NormalizedTrade } from "./types";
