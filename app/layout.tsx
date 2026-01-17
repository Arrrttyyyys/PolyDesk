import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PolyDesk - Polymarket Risk Terminal",
  description: "TradFi-style risk terminal for Polymarket strategies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

