import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/** Headings only. The rounded, slightly hand-made shapes suit clay. */
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-baloo",
});

export const metadata: Metadata = {
  title: "Clayify — Photo to Clay Art",
  description:
    "Turn any photo into beautiful clay-style art with one click. Upload a photo, let AI work its magic, and create something you'll want to keep.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e2725b",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${baloo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
