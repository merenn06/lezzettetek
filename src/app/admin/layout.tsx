import type { ReactNode } from "react";

// Basit layout: login sayfasını da sarmalar ama herhangi bir auth yapmaz.
// Asıl admin koruması ve panel görünümü admin/(panel)/layout.tsx içinde.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

