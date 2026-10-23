const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export class TurnstileVerificationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = "TurnstileVerificationError";
    this.statusCode = statusCode;
  }
}

type SiteverifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    console.error("[turnstile] TURNSTILE_SECRET_KEY is not configured");
    throw new TurnstileVerificationError(
      "Güvenlik doğrulaması yapılandırılmamış.",
      503
    );
  }

  const responseToken = typeof token === "string" ? token.trim() : "";
  if (!responseToken) {
    throw new TurnstileVerificationError(
      "Güvenlik doğrulaması gerekli. Lütfen doğrulamayı tamamlayın."
    );
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", responseToken);
  if (remoteIp?.trim()) {
    body.set("remoteip", remoteIp.trim());
  }

  let verifyResponse: Response;
  try {
    verifyResponse = await fetch(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    console.error("[turnstile] siteverify request failed:", error);
    throw new TurnstileVerificationError(
      "Güvenlik doğrulaması şu an yapılamıyor. Lütfen kısa süre sonra tekrar deneyin.",
      503
    );
  }

  let data: SiteverifyResponse;
  try {
    data = (await verifyResponse.json()) as SiteverifyResponse;
  } catch (error) {
    console.error("[turnstile] siteverify invalid JSON:", error);
    throw new TurnstileVerificationError(
      "Güvenlik doğrulaması şu an yapılamıyor. Lütfen kısa süre sonra tekrar deneyin.",
      503
    );
  }

  if (!verifyResponse.ok || !data.success) {
    const codes = data["error-codes"]?.join(", ") || "unknown";
    console.warn("[turnstile] verification rejected:", codes);
    throw new TurnstileVerificationError(
      "Güvenlik doğrulaması başarısız veya süresi dolmuş. Sayfayı yenileyip tekrar deneyin."
    );
  }
}
