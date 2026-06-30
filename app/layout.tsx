import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ניהול בעלי זכויות | שביל התפוזים",
  description: "מערכת CRM לניהול בעלי זכויות, תקשורת WhatsApp והשוואת חתומים",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
