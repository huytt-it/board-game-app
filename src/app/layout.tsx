import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Board Game Arena — Social Deduction Games Online",
  description: "Play Blood on the Clocktower, Werewolf, Avalon and more social deduction games online with friends. Real-time multiplayer with no downloads required.",
  keywords: ["board games", "social deduction", "blood on the clocktower", "werewolf", "avalon", "online multiplayer"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased text-white`}>
        {/* Background decoration */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-purple-600/5 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-cyan-600/5 blur-[120px]" />
        </div>
        <main className="relative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
