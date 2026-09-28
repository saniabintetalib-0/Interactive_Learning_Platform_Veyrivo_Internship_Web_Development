import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduVerse 3D — Interactive Learning Ecosystem (Next.js + TypeScript)',
  description: 'Interactive 3D STEM Learning Platform for Classes 6–12 built with Next.js 15, TypeScript, SQLite, and WebGL Three.js.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50/40 text-slate-900">
        {children}
      </body>
    </html>
  );
}
