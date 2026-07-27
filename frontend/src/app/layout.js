import './globals.css'
import AppShell from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/Toast.jsx'

export const metadata = {
  title: {
    default: 'CruiserCrib Autocare Portal',
    template: '%s | CruiserCrib',
  },
  description: 'Manage your vehicles, bookings, and services — all in one place.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  )
}
