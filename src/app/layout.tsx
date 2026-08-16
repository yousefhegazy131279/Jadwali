import './globals.css'
import { SupabaseProvider } from '@/lib/supabaseProvider'
import { ThemeProvider } from '@/context/ThemeContext'
import { Cairo, Amiri } from 'next/font/google'
import { Toaster } from 'sonner'
import { BodyWrapper } from '@/components/BodyWrapper'
import PWAProvider from '@/components/PWAProvider'
import { TourProvider } from '@/context/TourContext'
import TourOverlay from '@/components/TourOverlay'

const cairo = Cairo({
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-cairo',
})

const amiri = Amiri({
  weight: ['400', '700'],
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-amiri',
})

export const metadata = {
  title: 'جَدْوَلِي',
  description: 'خطط يومك، أنجز مهامك، عش حياتك.',
  manifest: '/manifest.json',
  themeColor: '#D4AF37',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${amiri.variable}`}>
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body>
        <TourProvider>
          <SupabaseProvider>
            <ThemeProvider>
              <BodyWrapper>
                {children}
                <Toaster position="top-center" richColors />
              </BodyWrapper>
            </ThemeProvider>
          </SupabaseProvider>
          <TourOverlay />
        </TourProvider>
        <PWAProvider />
      </body>
    </html>
  )
}