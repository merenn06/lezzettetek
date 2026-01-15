import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

const ALLOWED_ROLES = new Set(["admin", "staff"]);

export default async function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  const role = profile?.role ? String(profile.role).trim().toLowerCase() : undefined;

  if (!role || !ALLOWED_ROLES.has(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-md text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Yetkisiz</h1>
          <p className="text-sm text-gray-600 mb-6">
            Bu alana erişim izniniz bulunmuyor.
          </p>
          <Link
            href="/"
            className="inline-flex items-center rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - hidden on mobile, fixed on desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <span className="text-lg font-bold text-gray-900">Admin Panel</span>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 text-sm">
          <Link
            href="/admin"
            className="block rounded-lg px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-800 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/siparisler"
            className="block rounded-lg px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-800 transition-colors"
          >
            Orders
          </Link>
          <Link
            href="/admin/urunler"
            className="block rounded-lg px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-800 transition-colors"
          >
            Products
          </Link>
          <Link
            href="/admin/messages"
            className="block rounded-lg px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-800 transition-colors"
          >
            Messages
          </Link>
          <Link
            href="/admin/settings"
            className="block rounded-lg px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-800 transition-colors"
          >
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
          <div className="md:hidden text-sm font-semibold text-gray-900">
            Admin Panel
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-500">
              Rol: <span className="font-medium text-gray-800">{role}</span>
            </div>
            <LogoutButton />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
