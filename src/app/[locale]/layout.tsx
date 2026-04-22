import { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Providers } from "@/components/layout/Providers";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { AuthGuard } from "@/components/layout/AuthGuard";

interface LayoutProps {
  children: ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({ children, params: { locale } }: LayoutProps) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        <div className="max-w-[430px] mx-auto min-h-screen bg-background relative shadow-2xl shadow-black/60">
          <Header />
          <main className="pb-24">
            <AuthGuard>{children}</AuthGuard>
          </main>
          <BottomNav />
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
