import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/lib/auth-provider";
import Navbar from "@/components/layout/navbar";
import ClientLayout from "@/components/layout/client-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finančný Dashboard",
  description: "Dashboard pre klientov účtovnej firmy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" suppressHydrationWarning>
      <body className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.className
        )}>
          <AuthProvider>
            <ClientLayout>
              <div className="relative flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">
                  {children}
                </main>
              </div>
            </ClientLayout>
          </AuthProvider>
        </body>
    </html>
  );
}
