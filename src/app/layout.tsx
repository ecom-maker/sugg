import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Sugg – Admission Management Platform",
    template: "%s | Sugg",
  },
  description:
    "End-to-end admission management platform for colleges, agencies, and counselors. WhatsApp-first lead management with commission tracking.",
  keywords: [
    "admission management",
    "education CRM",
    "college management",
    "student admissions",
    "WhatsApp lead management",
  ],
  authors: [{ name: "Sugg" }],
  creator: "Sugg",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
