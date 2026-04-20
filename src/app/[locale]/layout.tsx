import type { Metadata } from "next";
import { ReactNode } from "react";
import { Providers } from "@/components/layout/Providers";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "TokuMachi",
  description:
    "Community-driven retail price information platform",
  manifest: "/manifest.json",
  themeColor: "#3B82F6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

interface LayoutProps {
  children: ReactNode;
  params: {
    locale: string;
  };
}

export default function RootLayout({
  children,
  params: { locale },
}: LayoutProps) {
  return (
    <html lang={locale}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <Providers>
          <Header />
          <main className="pb-20 md:pb-0">
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
