import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Class Detective",
  description: "Find the classes you're eligible to take.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen min-h-dvh flex-col">
        {/* Navbar reads the URL (usePathname), which needs a Suspense
            boundary on pages with a dynamic segment like /courses/[courseKey]. */}
        <Suspense
          fallback={<div aria-hidden="true" className="h-[81px] border-b border-white/10 bg-[#0a2d26]" />}
        >
          <Navbar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
