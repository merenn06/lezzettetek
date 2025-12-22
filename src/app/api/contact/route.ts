import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const contactNotifyEmail = process.env.CONTACT_NOTIFY_EMAIL;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Sunucu ayarları eksik (env)." },
        { status: 500 }
      );
    }

    if (!resendApiKey || !contactNotifyEmail || !resendFromEmail) {
      console.warn("Resend env variables are missing or incomplete; email notifications disabled.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Geçersiz istek gövdesi" },
        { status: 400 }
      );
    }

    const { fullName, email, subject, message } = body as {
      fullName?: string;
      email?: string;
      subject?: string;
      message?: string;
    };

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { success: false, error: "Ad Soyad zorunludur." },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "E-posta zorunludur." },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Mesaj zorunludur." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Geçerli bir e-posta adresi giriniz." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("contact_messages").insert({
      full_name: fullName.trim(),
      email: email.trim(),
      subject: subject?.trim() || null,
      message: message.trim(),
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { success: false, error: "Mesaj kaydedilirken bir hata oluştu." },
        { status: 500 }
      );
    }

    if (resendApiKey && contactNotifyEmail && resendFromEmail) {
      try {
        const resend = new Resend(resendApiKey);

        const timestamp = new Date().toISOString();

        const lines = [
          `Yeni iletişim mesajı alındı:`,
          "",
          `Ad Soyad: ${fullName.trim()}`,
          `E-posta: ${email.trim()}`,
          subject && subject.trim() ? `Konu: ${subject.trim()}` : undefined,
          "",
          "Mesaj:",
          message.trim(),
          "",
          `Zaman damgası: ${timestamp}`,
        ].filter(Boolean) as string[];

        await resend.emails.send({
          from: resendFromEmail,
          to: contactNotifyEmail,
          subject: "Yeni İletişim Mesajı",
          text: lines.join("\n"),
        });
      } catch (emailError) {
        console.error("Resend email error:", emailError);
        // Do not fail the request if email sending fails
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json(
      { success: false, error: "Beklenmeyen bir hata oluştu." },
      { status: 500 }
    );
  }
}

