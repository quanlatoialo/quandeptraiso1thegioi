import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import DemoBanner from '@/components/DemoBanner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Gamer 2 Gamer — Peer-to-Peer Gaming Escrow Marketplace',
  description:
    'Secure international marketplace connecting gamers with verified sellers and boosters. Full two-sided escrow protection on all accounts, in-game items, and boosting services.',
  keywords: 'gaming marketplace, buy game accounts, valorant accounts, wow gold, rank boost, gaming escrow',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#06090e] text-gray-100 flex flex-col min-h-screen antialiased selection:bg-purple-600 selection:text-white">
        <AuthProvider>
          <DemoBanner />
          <Header />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
