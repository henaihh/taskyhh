import type { Metadata } from 'next';
import { DM_Sans, Space_Mono } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
});

export const metadata: Metadata = {
  title: 'TaskBot — AI Task Manager',
  description: 'Human → Robot task execution with AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${dmSans.variable} ${spaceMono.variable} font-sans antialiased bg-[#0B0F1A] text-[#F9FAFB] min-h-screen`}>
        <div className="mx-auto max-w-[480px] md:max-w-[1200px] min-h-screen relative">
          {children}
        </div>
      </body>
    </html>
  );
}
