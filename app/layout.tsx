import React from 'react';
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClientOnly } from './components/ClientOnly'
import { WalletProvider } from './components/WalletProvider'
import { NetworkProvider } from './contexts/NetworkContext'
import { TutorialProvider } from './contexts/TutorialContext'
import './globals.css'
import './styles/design-system.css'
import './styles/animations.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Sealevel Studio - Open the Solana Black Box',
    template: '%s | Sealevel Studio',
  },
  description: 'The Interactive Transaction Simulator & Assembler for Solana',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://sealevel-studio.vercel.app'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-gray-900 text-gray-100 antialiased`}>
        <NetworkProvider>
          <WalletProvider>
            <TutorialProvider>
              {children}
            </TutorialProvider>
          </WalletProvider>
        </NetworkProvider>
      </body>
    </html>
  )
}
