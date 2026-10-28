import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const gilroy = localFont({
  src: [
    { path: "../fonts/Gilroy-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Gilroy-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Gilroy-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Gilroy-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-gilroy",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Virgo · Szabadságkezelés",
  description: "Szabadságigények, keretek és csapatnaptár a Virgo számára.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={`${gilroy.variable} h-full`}>
      <body className="min-h-full bg-background text-sm text-foreground antialiased">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
