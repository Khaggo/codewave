import './globals.css'
import { Inter } from 'next/font/google'
import AppShell from '@/components/layout/AppShell'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata = {
  title: {
    default: 'CruiserCrib Autocare Portal',
    template: '%s | CruiserCrib',
  },
  description: 'Manage your vehicles, bookings, and services — all in one place.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
