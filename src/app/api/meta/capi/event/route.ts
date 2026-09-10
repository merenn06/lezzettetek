import { NextResponse } from "next/server";
import {
  isBrowserCapiEventName,
  sendBrowserEventCapi,
} from "@/lib/meta/browser-event-capi";
import { isAdminPath } from "@/lib/meta/constants";
import { getMetaCookiesFromRequest } from "@/lib/meta/server-cookies";
import type { MetaCapiCustomData } from "@/lib/meta/capi";

export const runtime = "nodejs";

const MAX_EVENT_ID_LENGTH = 200;
const EVENT_ID_PATTERN = /^[a-zA-Z0-9_./:-]+$/;

const ALLOWED_CUSTOM_DATA_KEYS = new Set([
  "value",
  "currency",
  "content_ids",
  "content_type",
  "contents",
  "num_items",
  "content_name",
]);

type BrowserCapiEventRequestBody = {
  eventName?: unknown;
  eventId?: unknown;
  customData?: unknown;
  eventSourceUrl?: unknown;
  pathname?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeCustomData(value: unknown): MetaCapiCustomData | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const sanitized: MetaCapiCustomData = {};

  for (const [key, raw] of Object.entries(value)) {
    if (!ALLOWED_CUSTOM_DATA_KEYS.has(key)) {
      continue;
    }

    if (key === "value" || key === "num_items") {
      if (typeof raw === "number" && !Number.isNaN(raw)) {
        sanitized[key] = raw;
      }
      continue;
    }

    if (key === "currency" || key === "content_type" || key === "content_name") {
      if (typeof raw === "string" && raw.trim()) {
        sanitized[key] = raw.trim();
      }
      continue;
    }

    if (key === "content_ids") {
      if (
        Array.isArray(raw) &&
        raw.every((item) => typeof item === "string" && item.trim())
      ) {
        sanitized.content_ids = raw.map((item) => item.trim());
      }
      continue;
    }

    if (key === "contents") {
      if (!Array.isArray(raw)) continue;

      const contents = raw
        .filter(isRecord)
        .map((item) => ({
          id: typeof item.id === "string" ? item.id.trim() : "",
          quantity:
            typeof item.quantity === "number" && !Number.isNaN(item.quantity)
              ? item.quantity
              : undefined,
          item_price:
            typeof item.item_price === "number" && !Number.isNaN(item.item_price)
              ? item.item_price
              : undefined,
        }))
        .filter((item) => item.id);

      if (contents.length > 0) {
        sanitized.contents = contents;
      }
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function getPathnameFromUrl(url: string): string | null {
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

function shouldSkipAdminTracking(
  pathname: unknown,
  eventSourceUrl: unknown
): boolean {
  if (typeof pathname === "string" && isAdminPath(pathname)) {
    return true;
  }

  if (typeof eventSourceUrl === "string") {
    const urlPathname = getPathnameFromUrl(eventSourceUrl);
    if (urlPathname && isAdminPath(urlPathname)) {
      return true;
    }
  }

  return false;
}

function getClientIpAddress(request: Request): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    undefined
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BrowserCapiEventRequestBody;

    if (
      typeof body.eventName !== "string" ||
      !isBrowserCapiEventName(body.eventName)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid or unsupported eventName" },
        { status: 400 }
      );
    }

    if (typeof body.eventId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid eventId" },
        { status: 400 }
      );
    }

    const eventId = body.eventId.trim();
    if (
      !eventId ||
      eventId.length > MAX_EVENT_ID_LENGTH ||
      !EVENT_ID_PATTERN.test(eventId)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid eventId format" },
        { status: 400 }
      );
    }

    if (shouldSkipAdminTracking(body.pathname, body.eventSourceUrl)) {
      return NextResponse.json({ ok: true, skipped: true, reason: "admin_path" });
    }

    let eventSourceUrl: string | undefined;
    if (typeof body.eventSourceUrl === "string" && body.eventSourceUrl.trim()) {
      try {
        const parsed = new URL(body.eventSourceUrl.trim());
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          eventSourceUrl = parsed.toString();
        }
      } catch {
        return NextResponse.json(
          { ok: false, error: "Invalid eventSourceUrl" },
          { status: 400 }
        );
      }
    }

    const customData = sanitizeCustomData(body.customData);
    const { fbp, fbc } = getMetaCookiesFromRequest(request);

    await sendBrowserEventCapi({
      eventName: body.eventName,
      eventId,
      eventSourceUrl,
      customData,
      clientIpAddress: getClientIpAddress(request),
      clientUserAgent: request.headers.get("user-agent") || undefined,
      fbp,
      fbc,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[meta-capi-event] Request error:", error);
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
