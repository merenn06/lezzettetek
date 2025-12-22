import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createSupabaseServerClient() {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        const cookieStore = cookies() as any;
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        const cookieStore = cookies() as any;
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        const cookieStore = cookies() as any;
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}
