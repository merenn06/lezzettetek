import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendMail } from "@/lib/email/sendMail";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

type NotifyPayload = {
  type?: string;
  title?: string;
  content?: string;
  link?: string;
  testEmail?: string;
};

const BATCH_SIZE = 50;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildEmailHtml({
  headline,
  title,
  content,
  link,
  unsubscribeUrl,
}: {
  headline: string;
  title: string;
  content: string;
  link: string;
  unsubscribeUrl: string;
}) {
  const safeTitle = escapeHtml(title);
  const safeContent = escapeHtml(content).replace(/\n/g, "<br />");
  const safeLink = escapeHtml(link);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #15803d; margin-bottom: 8px;">${headline}</h2>
      <h3 style="margin: 0 0 16px 0; font-size: 20px; color: #111827;">${safeTitle}</h3>
      <p style="margin: 0 0 20px 0; color: #374151; line-height: 1.6;">${safeContent}</p>
      <p style="margin: 0 0 24px 0;">
        <a href="${safeLink}" style="color: #15803d; font-weight: 600; text-decoration: none;">
          Detayları görüntüle
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 12px; color: #6b7280; margin: 0;">
        E-posta bildirimlerini kapatmak için
        <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">buraya tıklayın</a>.
      </p>
    </div>
  `;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: "Supabase env değişkenleri eksik." },
        { status: 500 }
      );
    }

    if (!siteUrl) {
      return NextResponse.json(
        { success: false, error: "NEXT_PUBLIC_SITE_URL env değişkeni eksik." },
        { status: 500 }
      );
    }

    const body = (await request.json().catch(() => null)) as NotifyPayload | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Geçersiz istek gövdesi." },
        { status: 400 }
      );
    }

    const { type, title, content, link, testEmail } = body;

    if (!type || !title || !content || !link) {
      return NextResponse.json(
        { success: false, error: "type, title, content ve link alanları zorunludur." },
        { status: 400 }
      );
    }

    const isNewProduct = type === "new_product";
    const isNewCampaign = type === "new_campaign";

    if (!isNewProduct && !isNewCampaign) {
      return NextResponse.json(
        { success: false, error: "Geçersiz type değeri." },
        { status: 400 }
      );
    }

    const headline = isNewProduct ? "Yeni Ürün" : "Yeni Kampanya";
    const subject = `${headline}: ${title}`;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    if (testEmail && testEmail.trim()) {
      const unsubscribeUrl = `${siteUrl}/unsubscribe?token=test`;
      const html = buildEmailHtml({
        headline,
        title,
        content,
        link,
        unsubscribeUrl,
      });

      await sendMail({ to: [testEmail.trim()], subject, html });
      return NextResponse.json({ success: true, sent: 1, test: true }, { status: 200 });
    }

    const preferenceColumn = isNewProduct ? "new_products" : "new_campaigns";
    const { data, error } = await supabase
      .from("email_subscriptions")
      .select("email, unsubscribe_token")
      .eq("enabled", true)
      .eq(preferenceColumn, true);

    if (error) {
      console.error("[admin-notify] Supabase error:", error);
      return NextResponse.json(
        { success: false, error: "Aboneler alınamadı." },
        { status: 500 }
      );
    }

    const recipients = (data ?? []).filter((row) => row.email && row.unsubscribe_token);

    let sent = 0;
    const failures: { email: string; error: string }[] = [];

    const batches = chunkArray(recipients, BATCH_SIZE);
    for (const batch of batches) {
      await Promise.all(
        batch.map(async (row) => {
          const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${row.unsubscribe_token}`;
          const html = buildEmailHtml({
            headline,
            title,
            content,
            link,
            unsubscribeUrl,
          });

          try {
            await sendMail({ to: [row.email], subject, html });
            sent += 1;
          } catch (err) {
            const message = err instanceof Error ? err.message : "Mail gönderilemedi.";
            failures.push({ email: row.email, error: message });
          }
        })
      );
    }

    return NextResponse.json(
      {
        success: true,
        sent,
        failed: failures.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[admin-notify] Error:", err);
    return NextResponse.json(
      { success: false, error: "Beklenmeyen bir hata oluştu." },
      { status: 500 }
    );
  }
}
