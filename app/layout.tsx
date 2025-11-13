import React from 'react';
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClientOnly } from './components/ClientOnly'
import { WalletProvider } from './components/WalletProvider'
import { NetworkProvider } from './contexts/NetworkContext'
import { TutorialProvider } from './contexts/TutorialContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sealevel Studio - Open the Solana Black Box',
  description: 'The Interactive Transaction Simulator & Assembler for Solana',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
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
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className={`${inter.className} bg-gray-900 text-gray-100 antialiased`}>
        <ClientOnly>
          <NetworkProvider>
            <WalletProvider>
              <TutorialProvider>
                {children}
              </TutorialProvider>
            </WalletProvider>
          </NetworkProvider>
        </ClientOnly>
      </body>
    </html>
  )
}
