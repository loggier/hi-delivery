import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Mulish } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";

const mulish = Mulish({ subsets: ["latin"], variable: "--font-mulish" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Hi Delivery Admin";

export const metadata: Metadata = {
  title: appName,
  description: `Panel de administración para ${appName}`,
  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/icon.png', type: 'image/png', sizes: '128x128' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${mulish.variable} ${geist.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
