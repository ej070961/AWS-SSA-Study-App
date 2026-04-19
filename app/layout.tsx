import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import TabBar from "@/components/TabBar";
import { AppDataProvider } from "@/lib/app-data-context";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "SAA-C03 스터디",
  description: "AWS Solutions Architect Associate 학습 앱",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geist.variable} h-full`}>
      <body className="h-full bg-gray-50 font-(family-name:--font-geist)">
        <AppDataProvider>
          <div className="max-w-lg mx-auto flex flex-col h-full">
            <main className="flex-1 overflow-y-auto pb-20 px-4 pt-4">{children}</main>
            <TabBar />
          </div>
        </AppDataProvider>
      </body>
    </html>
  );
}
