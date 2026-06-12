import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrailPay — Programmable Trust Layer for African Education",
  description:
    "Lock diaspora school fees in Lightning escrow. Schools redeem per term on enrollment. Unused terms auto-refund. Cryptographically diversion-proof.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
