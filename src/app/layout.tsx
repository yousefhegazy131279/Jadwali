import './globals.css'
import { SupabaseProvider } from '@/lib/supabaseProvider'
import { ThemeProvider } from '@/context/ThemeContext'
import { Cairo, Amiri } from 'next/font/google'
import { Toaster } from 'sonner'
import { BodyWrapper } from '@/components/BodyWrapper'
import PWAProvider from '@/components/PWAProvider'
import { TourProvider } from '@/context/TourContext' // ✅ إضافة
import TourOverlay from '@/components/TourOverlay' // ✅ إضافة

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
      <body>
        <TourProvider> {/* ✅ الجولة تغلف كل شيء */}
          <SupabaseProvider>
            <ThemeProvider>
              <BodyWrapper>
                {children}
                <Toaster position="top-center" richColors />
              </BodyWrapper>
            </ThemeProvider>
          </SupabaseProvider>
          <TourOverlay /> {/* ✅ طبقة الجولة تكون خارج BodyWrapper لكن داخل TourProvider */}
        </TourProvider>
        <PWAProvider />
      </body>
    </html>
  )
}