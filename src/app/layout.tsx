import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Providers } from "@/components/providers/Providers";
import ParticleBackground from "@/components/ui/ParticleBackground";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Lic. Federico Colella | Kinesiología Deportiva",
  description: "Kinesiología Deportiva de Alto Rendimiento. Recuperación de lesiones y optimización del movimiento.",
  icons: {
    icon: '/assets/logo/iso_sobre_color.jpg',
    apple: '/assets/logo/iso_sobre_color.jpg',
    shortcut: '/assets/logo/iso_sobre_color.jpg',
  },
  appleWebApp: {
    capable: true,
    title: 'Fede Colella',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Lic. Federico Colella | Kinesiología Deportiva',
    description: 'Recuperación de lesiones y optimización del movimiento con atención personalizada.',
    url: 'https://fedecolellafisio.com',
    siteName: 'Federico Colella',
    type: 'website',
    locale: 'es_AR',
    images: [
      {
        url: '/assets/logo/logo_sin_matricula_sobre_color.jpg',
        width: 1200,
        height: 630,
        alt: 'Lic. Federico Colella - Kinesiología Deportiva',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lic. Federico Colella | Kinesiología Deportiva',
    description: 'Recuperación de lesiones y optimización del movimiento con atención personalizada.',
    images: ['/assets/logo/logo_sin_matricula_sobre_color.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jakarta.variable} antialiased`}
      >
        <ParticleBackground />
        <Providers>
            <Header />
            {children}
        </Providers>
      </body>
    </html>
  );
}
