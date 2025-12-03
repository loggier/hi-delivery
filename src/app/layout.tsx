import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "./(site)/_components/header";
import { Footer } from "./(site)/_components/footer";

const mulish = Mulish({ subsets: ["latin"], variable: "--font-mulish" });

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Hi Delivery Admin";

export const metadata: Metadata = {
  title: appName,
  description: `Panel de administración para ${appName}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${mulish.variable} font-sans antialiased`}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
