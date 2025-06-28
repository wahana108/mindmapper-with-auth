
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Link from "next/link";
import ClientNav from "@/components/ClientNav"; // We'll create this

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MindMapper Lite - Phase 6",
  description: "Simplified mind mapping with Google Auth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground`}>
        <AuthProvider>
          <ClientNav />
          <main className="p-4 sm:p-6 md:p-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
