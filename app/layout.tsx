"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { LocaleProvider } from "@/contexts/locale-context";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
