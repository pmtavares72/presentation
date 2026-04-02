import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Manrope } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/context/SidebarContext";
import AppShell from "@/components/AppShell";
import SidebarServer from "@/components/SidebarServer";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Slide Gallery",
  description: "Browse and preview presentation slides",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-surface">
        <SidebarProvider>
          <AppShell sidebar={<SidebarServer />}>{children}</AppShell>
        </SidebarProvider>
      </body>
    </html>
  );
}
