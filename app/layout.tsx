import type React from "react"
import type { Metadata } from "next"
import { Inter, Merriweather } from "next/font/google"
import "./globals.css"

// Sans-serif font for UI elements and body text
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

// Primary serif font for headings (similar to what's in the screenshots)
const serif = Merriweather({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-serif",
})

export const metadata: Metadata = {
  title: "JSTOR Digital Stewardship Services",
  description: "Your home for all processing, cataloging, and managing collections.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${serif.variable} font-sans`}>{children}</body>
    </html>
  )
}
