import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "פרויקט גוש 6446 · הוד השרון — ניהול בעלים והקצאה",
  description: "מערכת ניהול בעלים והקצאה, תקשורת WhatsApp ומעקב חתימות · תכנית 423-0099697",
};

// viewport מפורש — יציבות גלילה וזום בספארי iOS
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f4d3a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
