import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";

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
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
