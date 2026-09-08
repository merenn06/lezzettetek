import { createHash } from "node:crypto";
import {
  getMetaApiVersion,
  getMetaTestEventCode,
  getServerPixelId,
  isMetaCapiEnabled,
  META_GRAPH_API_BASE,
  type MetaEventName,
} from "./constants";

/** Ensures this module is never bundled for the browser. */
function assertServerSide(): void {
  if (typeof window !== "undefined") {
    throw new Error("Meta CAPI helpers must only be used on the server.");
  }
}

export type MetaCapiUserDataInput = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  externalId?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbc?: string | null;
  fbp?: string | null;
};

export type MetaCapiCustomData = {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: Array<{ id: string; quantity?: number; item_price?: number }>;
  num_items?: number;
  order_id?: string;
  [key: string]: unknown;
};

export type SendMetaCapiEventInput = {
  eventName: MetaEventName;
  eventId: string;
  eventSourceUrl?: string;
  eventTime?: number;
  actionSource?: "website" | "email" | "app" | "phone_call" | "chat" | "physical_store" | "system_generated" | "other";
  userData?: MetaCapiUserDataInput;
  customData?: MetaCapiCustomData;
};

export type SendMetaCapiEventResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  response?: unknown;
  error?: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeGeneric(value: string): string {
  return value.trim().toLowerCase();
}

function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashIfPresent(value: string | null | undefined, normalizer: (v: string) => string): string[] | undefined {
  if (!value?.trim()) return undefined;
  return [hashSha256(normalizer(value))];
}

/** Hashes user data per Meta CAPI requirements (SHA-256 after normalization). */
export function hashMetaUserData(input: MetaCapiUserDataInput): Record<string, string | string[]> {
  const hashed: Record<string, string | string[]> = {};

  const em = hashIfPresent(input.email, normalizeEmail);
  if (em) hashed.em = em;

  const ph = hashIfPresent(input.phone, normalizePhone);
  if (ph) hashed.ph = ph;

  const fn = hashIfPresent(input.firstName, normalizeName);
  if (fn) hashed.fn = fn;

  const ln = hashIfPresent(input.lastName, normalizeName);
  if (ln) hashed.ln = ln;

  const ct = hashIfPresent(input.city, normalizeGeneric);
  if (ct) hashed.ct = ct;

  const st = hashIfPresent(input.state, normalizeGeneric);
  if (st) hashed.st = st;

  const zp = hashIfPresent(input.zip, normalizeGeneric);
  if (zp) hashed.zp = zp;

  const country = hashIfPresent(input.country, normalizeGeneric);
  if (country) hashed.country = country;

  const externalId = hashIfPresent(input.externalId, normalizeGeneric);
  if (externalId) hashed.external_id = externalId;

  if (input.clientIpAddress?.trim()) {
    hashed.client_ip_address = input.clientIpAddress.trim();
  }
  if (input.clientUserAgent?.trim()) {
    hashed.client_user_agent = input.clientUserAgent.trim();
  }
  if (input.fbc?.trim()) {
    hashed.fbc = input.fbc.trim();
  }
  if (input.fbp?.trim()) {
    hashed.fbp = input.fbp.trim();
  }

  return hashed;
}

/** Splits a full name into first/last for hashing. */
export function splitCustomerName(fullName: string | null | undefined): {
  firstName: string | null;
  lastName: string | null;
} {
  if (!fullName?.trim()) {
    return { firstName: null, lastName: null };
  }

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Sends a single event to Meta Conversions API (server-side only).
 * Returns `{ ok: true, skipped: true }` when disabled via env.
 */
export async function sendMetaCapiEvent(
  input: SendMetaCapiEventInput
): Promise<SendMetaCapiEventResult> {
  assertServerSide();

  if (!isMetaCapiEnabled()) {
    return {
      ok: true,
      skipped: true,
      reason: "Meta CAPI disabled or missing credentials",
    };
  }

  const pixelId = getServerPixelId();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();

  if (!pixelId || !accessToken) {
    return {
      ok: false,
      error: "Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN",
    };
  }

  const apiVersion = getMetaApiVersion();
  const url = `${META_GRAPH_API_BASE}/${apiVersion}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  const eventPayload: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: input.actionSource ?? "website",
    user_data: input.userData ? hashMetaUserData(input.userData) : {},
  };

  if (input.eventSourceUrl) {
    eventPayload.event_source_url = input.eventSourceUrl;
  }
  if (input.customData && Object.keys(input.customData).length > 0) {
    eventPayload.custom_data = input.customData;
  }

  const body: Record<string, unknown> = {
    data: [eventPayload],
  };

  const testEventCode = getMetaTestEventCode();
  if (testEventCode) {
    body.test_event_code = testEventCode;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseJson = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        error: `Meta CAPI request failed (${response.status})`,
        response: responseJson,
      };
    }

    return {
      ok: true,
      response: responseJson,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Meta CAPI error",
    };
  }
}
