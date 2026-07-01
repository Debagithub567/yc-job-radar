import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YC Job Radar",
  description: "A filtered signal on YC engineering roles — no scroll, no algorithm.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
