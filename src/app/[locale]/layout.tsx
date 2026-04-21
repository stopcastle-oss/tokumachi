import { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Providers } from "@/components/layout/Providers";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

interface LayoutProps {
  children: ReactNode;
  params: {
    locale: string;
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: LayoutProps) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        <div className="max-w-[430px] mx-auto min-h-screen bg-white dark:bg-gray-900 shadow-xl shadow-gray-300/50 dark:shadow-black/40 relative">
          <Header />
          <main className="pb-20">
            {children}
          </main>
          <BottomNav />
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
