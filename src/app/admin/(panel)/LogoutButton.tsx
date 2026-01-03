"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleLogout = async () => {
    try {
      // Call logout API to delete admin_session cookie
      await fetch("/api/admin/logout", { method: "POST" });
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Redirect to login
      router.push("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still redirect on error
      router.push("/admin/login");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
    >
      Çıkış
    </button>
  );
}

