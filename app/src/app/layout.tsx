import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FTI SME Funding Connect',
  description: 'ระบบเชื่อมโยงการสนับสนุน SME — ส.อ.ท.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
