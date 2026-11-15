import type { Metadata } from "next";
import { siteUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "FlexTrigger NL",
    template: "%s — FlexTrigger NL",
  },
  description:
    "Vacaturetriggers en Nederlandse acquisitiemail voor uitzendbureaus in logistiek en warehousing.",
  openGraph: {
    title: "FlexTrigger NL",
    description: "Speed-to-lead voor logistieke uitzendbureaus in Noord-Brabant.",
    locale: "nl_NL",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <a
          href="#inhoud"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-3 focus:py-2"
        >
          Naar inhoud
        </a>
        {children}
      </body>
    </html>
  );
}
