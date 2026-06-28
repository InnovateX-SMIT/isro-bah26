import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientSidebar from "@/components/ClientSidebar";
import { SidebarProvider } from "@/components/SidebarContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI-Powered Geospatial Reconstruction Platform",
  description: "Generative AI-Based Cloud Removal and Reconstruction for LISS-IV Satellite Imagery",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-full flex flex-col bg-background text-foreground relative">
        <SidebarProvider>
          <div className="flex-grow flex overflow-hidden">
            <ClientSidebar />
            <main className="flex-1 overflow-y-auto p-6 bg-background">
              <div className="w-full h-full">
                {children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
