import type React from "react"
import type { Metadata } from "next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { LayoutHeader } from "@/components/layout-header"
import { ClientProviders } from "./client-providers"

export const metadata: Metadata = {
  title: {
    default: "Anchor Protocol — DeFi Lending Markets",
    template: "%s — Anchor Protocol",
  },
  description:
    "Anchor Protocol is a Casper-native lending protocol with isolated markets, transparent risk parameters, and real-time oracle pricing.",
  applicationName: "Anchor Protocol",
  keywords: [
    "Anchor Protocol",
    "Casper",
    "DeFi",
    "Lending",
    "Borrowing",
    "Isolated Markets",
    "CEP-18",
  ],
  generator: "Next.js",
  icons: {
    icon: [{ url: "/img/logo.jpg", type: "image/jpeg" }],
    shortcut: "/img/logo.jpg",
    apple: "/img/logo.jpg",
  },
  openGraph: {
    title: "Anchor Protocol — DeFi Lending Markets",
    description:
      "Lend and borrow on Casper with isolated markets, protocol-defined risk limits, and oracle-driven pricing.",
    type: "website",
    images: [
      {
        url: "/img/logo.jpg",
        width: 512,
        height: 512,
        alt: "Anchor Protocol",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Anchor Protocol — DeFi Lending Markets",
    description:
      "Lend and borrow on Casper with isolated markets, protocol-defined risk limits, and oracle-driven pricing.",
    images: ["/img/logo.jpg"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistMono.className} dark`}>
      <body className={`${GeistSans.className} font-sans antialiased`}>
        <ClientProviders>
          <LayoutHeader />
          {children}
          <Analytics />
        </ClientProviders>
      </body>
    </html>
  )
}
