import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { Providers } from '@/shared/providers/Providers'
import './globals.scss'

const inter = Inter({
    subsets: ['latin', 'latin-ext'],
    variable: '--font-inter',
    display: 'swap',
})

export const metadata: Metadata = {
    title: { default: 'Atimi CRM', template: '%s · Atimi CRM' },
    description: 'CRM Atlantis · Atimi',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
}

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="pl">
            <body className={inter.variable}>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
