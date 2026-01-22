import type { Metadata } from "next";
import ToptanSatisClient from "./ToptanSatisClient";

export const metadata: Metadata = {
  title: "Toptan Enginar Satışı | Market ve Restoranlar İçin Kurumsal Tedarik",
  description:
    "Marketler, restoranlar ve işletmeler için toptan enginar ve zeytinyağlı ürün tedariki. Kurumsal satış ve özel fiyat teklifleri.",
};

export default function ToptanSatisPage() {
  return <ToptanSatisClient />;
}
