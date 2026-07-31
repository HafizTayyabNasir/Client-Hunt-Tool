import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Google Maps Business Lead Scraper & Mining Dashboard',
  description: 'Automated B2B lead generation engine with verified emails, Instagram, and Facebook profile extraction.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0f19] text-slate-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
