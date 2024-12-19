import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Inference',
  description: 'AI-powered news and research platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning={true} className={`${geist.className} bg-black text-white min-h-screen`}>
        <Navigation />
        <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
