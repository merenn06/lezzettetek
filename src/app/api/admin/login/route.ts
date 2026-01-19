import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const {
      data: { session },
    } = await supabase.auth.getSession();

    let authUser = session?.user || null;

    if (!authUser) {
      const authHeader = request.headers.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

      if (token && supabaseUrl && supabaseAnonKey) {
        const fallbackClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data } = await fallbackClient.auth.getUser(token);
        authUser = data?.user || null;
      }
    }

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Oturum bulunamadı" },
        { status: 401 }
      );
    }

    const getAdminEmails = () => {
      const orderNotify = process.env.ORDER_NOTIFY_EMAIL || "";
      const adminEmail = process.env.ADMIN_EMAIL || "";
      const contactNotify = process.env.CONTACT_NOTIFY_EMAIL || "";
      const all = [orderNotify, adminEmail, contactNotify]
        .filter(Boolean)
        .flatMap((val) => val.split(","))
        .map((val) => val.trim().toLowerCase())
        .filter((val) => val.length > 0);
      return Array.from(new Set(all));
    };

    const userEmail = (authUser.email || "").trim().toLowerCase();
    const adminEmails = getAdminEmails();

    // Check if user has admin/staff role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .maybeSingle();

    const role = profile?.role ? String(profile.role).trim().toLowerCase() : undefined;
    const ALLOWED_ROLES = new Set(["admin", "staff"]);

    const hasRole = role && ALLOWED_ROLES.has(role);
    const hasEmailAccess = userEmail && adminEmails.includes(userEmail);

    if (!hasRole && !hasEmailAccess) {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    // Set admin_session cookie
    const isProduction = process.env.NODE_ENV === "production";
    const response = NextResponse.json({ success: true });
    
    response.cookies.set("admin_session", "1", {
      httpOnly: true,
      sameSite: "strict",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("[admin-login] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Sunucu hatası" },
      { status: 500 }
    );
  }
}






