import { supabase } from "@/lib/supabaseClient";
import type { OrderAttributionSnapshot } from "./order-attribution";
import { getAttributionRetentionExpiresAt } from "./order-attribution";
import { attributionSnapshotUsableForCapi, isAttributionExpired } from "./attribution-expiry";
import {
  buildClaimExpiresAt,
  type PurchaseCapiClaimResult,
  type PurchaseCapiClaimState,
  SAVE_ORDER_ATTRIBUTION_TIMEOUT_MS,
} from "./purchase-capi-claim";

export type StoredOrderAttribution = OrderAttributionSnapshot & {
  orderId: string;
  expiresAt?: string | null;
  purchaseCapiSentAt?: string | null;
  purchaseCapiClaimedUntil?: string | null;
};

type AttributionRow = {
  order_id: string;
  consent_granted: boolean;
  meta_fbp: string | null;
  meta_fbc: string | null;
  meta_event_source_url: string | null;
  meta_client_ip: string | null;
  meta_client_user_agent: string | null;
  expires_at: string | null;
  purchase_capi_sent_at: string | null;
  purchase_capi_claimed_until: string | null;
};

function mapRow(row: AttributionRow): StoredOrderAttribution {
  const base: StoredOrderAttribution = {
    orderId: row.order_id,
    consentGranted: row.consent_granted,
    expiresAt: row.expires_at,
    purchaseCapiSentAt: row.purchase_capi_sent_at,
    purchaseCapiClaimedUntil: row.purchase_capi_claimed_until,
  };

  if (isAttributionExpired(row.expires_at)) {
    return base;
  }

  return {
    ...base,
    fbp: row.meta_fbp ?? undefined,
    fbc: row.meta_fbc ?? undefined,
    eventSourceUrl: row.meta_event_source_url ?? undefined,
    clientIp: row.meta_client_ip ?? undefined,
    clientUserAgent: row.meta_client_user_agent ?? undefined,
  };
}

export async function saveOrderAttribution(
  orderId: string,
  snapshot: OrderAttributionSnapshot
): Promise<{ ok: boolean }> {
  if (!supabase) {
    console.warn("[order-attribution] save skipped: no supabase client");
    return { ok: false };
  }

  try {
    const expiresAt = snapshot.consentGranted ? getAttributionRetentionExpiresAt() : null;

    const payload = {
      order_id: orderId,
      consent_granted: snapshot.consentGranted,
      meta_fbp: snapshot.consentGranted ? snapshot.fbp ?? null : null,
      meta_fbc: snapshot.consentGranted ? snapshot.fbc ?? null : null,
      meta_event_source_url: snapshot.consentGranted ? snapshot.eventSourceUrl ?? null : null,
      meta_client_ip: snapshot.consentGranted ? snapshot.clientIp ?? null : null,
      meta_client_user_agent: snapshot.consentGranted ? snapshot.clientUserAgent ?? null : null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("order_meta_attribution").upsert(payload, {
      onConflict: "order_id",
    });

    if (error) {
      console.warn("[order-attribution] save failed", {
        orderId,
        code: error.code,
      });
      return { ok: false };
    }

    return { ok: true };
  } catch {
    console.warn("[order-attribution] save unexpected error", { orderId });
    return { ok: false };
  }
}

/**
 * Awaited save with bounded wait; never throws.
 */
export async function saveOrderAttributionWithTimeout(
  orderId: string,
  snapshot: OrderAttributionSnapshot,
  timeoutMs = SAVE_ORDER_ATTRIBUTION_TIMEOUT_MS
): Promise<{ ok: boolean; timedOut?: boolean }> {
  try {
    let timedOut = false;
    const result = await Promise.race([
      saveOrderAttribution(orderId, snapshot),
      new Promise<{ ok: boolean }>((resolve) => {
        setTimeout(() => {
          timedOut = true;
          resolve({ ok: false });
        }, timeoutMs);
      }),
    ]);
    return { ...result, timedOut };
  } catch {
    return { ok: false };
  }
}

export async function loadOrderAttribution(
  orderId: string
): Promise<StoredOrderAttribution | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("order_meta_attribution")
      .select(
        "order_id, consent_granted, meta_fbp, meta_fbc, meta_event_source_url, meta_client_ip, meta_client_user_agent, expires_at, purchase_capi_sent_at, purchase_capi_claimed_until"
      )
      .eq("order_id", orderId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapRow(data as AttributionRow);
  } catch {
    return null;
  }
}

export function storedToCapiSnapshot(
  stored: StoredOrderAttribution | null
): OrderAttributionSnapshot | null {
  if (!stored) return null;
  if (!attributionSnapshotUsableForCapi(stored, stored.expiresAt)) {
    return null;
  }
  return {
    consentGranted: stored.consentGranted,
    fbp: stored.fbp,
    fbc: stored.fbc,
    eventSourceUrl: stored.eventSourceUrl,
    clientIp: stored.clientIp,
    clientUserAgent: stored.clientUserAgent,
  };
}

/**
 * Atomik claim: yalnızca sent_at boş ve kilidi yok/süresi dolmuş satırlarda.
 */
const CLAIM_RPC_OUTCOMES: PurchaseCapiClaimState[] = [
  "claimed",
  "already_sent",
  "locked",
  "no_row",
  "consent_denied",
  "expired",
];

export async function tryClaimPurchaseCapiSend(orderId: string): Promise<PurchaseCapiClaimResult> {
  if (!supabase) return { state: "error" };

  try {
    const claimUntil = buildClaimExpiresAt();

    const { data, error } = await supabase.rpc("try_claim_order_purchase_capi", {
      p_order_id: orderId,
      p_claim_until: claimUntil,
    });

    if (error) {
      console.warn("[order-attribution] claim failed", { orderId, code: error.code });
      return { state: "error" };
    }

    const status = typeof data === "string" ? data : "";
    if (CLAIM_RPC_OUTCOMES.includes(status as PurchaseCapiClaimState)) {
      return {
        state: status as PurchaseCapiClaimState,
        claimUntil: status === "claimed" ? claimUntil : undefined,
      };
    }

    return { state: "error" };
  } catch {
    return { state: "error" };
  }
}

/** Meta başarılı yanıt sonrası; claim serbest. */
export async function markPurchaseCapiSentSuccess(
  orderId: string,
  claimUntil?: string
): Promise<void> {
  if (!supabase) return;

  try {
    const nowIso = new Date().toISOString();
    let query = supabase
      .from("order_meta_attribution")
      .update({
        purchase_capi_sent_at: nowIso,
        purchase_capi_claimed_until: null,
        updated_at: nowIso,
      })
      .eq("order_id", orderId)
      .is("purchase_capi_sent_at", null);

    if (claimUntil) {
      query = query.eq("purchase_capi_claimed_until", claimUntil);
    }

    await query;
  } catch {
    console.warn("[order-attribution] mark sent failed", { orderId });
  }
}

/** Gönderim başarısız; yalnızca bu worker'ın claim süresiyle eşleşen kilidi kaldırır. */
export async function releasePurchaseCapiClaim(
  orderId: string,
  claimUntil?: string
): Promise<void> {
  if (!supabase || !claimUntil) return;

  try {
    await supabase
      .from("order_meta_attribution")
      .update({
        purchase_capi_claimed_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)
      .eq("purchase_capi_claimed_until", claimUntil)
      .is("purchase_capi_sent_at", null);
  } catch {
    console.warn("[order-attribution] release claim failed", { orderId });
  }
}