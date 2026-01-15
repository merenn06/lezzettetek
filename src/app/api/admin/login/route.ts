import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Oturum bulunamadı" },
        { status: 401 }
      );
    }

    // Check if user has admin/staff role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    const role = profile?.role ? String(profile.role).trim().toLowerCase() : undefined;
    const ALLOWED_ROLES = new Set(["admin", "staff"]);

    if (!role || !ALLOWED_ROLES.has(role)) {
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






