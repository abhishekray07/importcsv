import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import { ApiProvider } from "@/components/ApiProvider";
import { PostHogProvider } from "@/components/PostHogProvider";
import { LogRocketProvider } from "@/components/LogRocketProvider";
import { HelpScoutWidget } from "@/components/HelpScoutWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ImportCSV",
  description: "Admin dashboard for ImportCSV application",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider dynamic>
          <PostHogProvider>
            <LogRocketProvider>
              <ApiProvider>
                {children}
                <Toaster />
                <HelpScoutWidget />
              </ApiProvider>
            </LogRocketProvider>
          </PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
