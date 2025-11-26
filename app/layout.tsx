import React from 'react';
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClientOnly } from './components/ClientOnly'
import { WalletProvider } from './components/WalletProvider'
import { PresaleCountdown } from './components/PresaleCountdown'
import { NetworkProvider } from './contexts/NetworkContext'
import { TutorialProvider } from './contexts/TutorialContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ChunkErrorHandler } from './components/ChunkErrorHandler'
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
    icon: [
      { url: '/sea-level-logo.png', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: '/sea-level-logo.png',
    shortcut: '/sea-level-logo.png',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://sealevel-studio.vercel.app'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href="/sea-level-logo.png" />
        <link rel="shortcut icon" type="image/png" href="/sea-level-logo.png" />
        <link rel="apple-touch-icon" href="/sea-level-logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Preload landing page video for instant playback */}
        <link rel="preload" href="/gemini_generated_video_EBF488F6.MP4" as="video" type="video/mp4" />
      </head>
      <body className={`${inter.className} bg-gray-900 text-gray-100 antialiased`} suppressHydrationWarning>
        <ChunkErrorHandler />
        <ErrorBoundary>
          <NetworkProvider>
            <WalletProvider>
              <TutorialProvider>
                {children}
              </TutorialProvider>
            </WalletProvider>
          </NetworkProvider>
        </ErrorBoundary>
        <ClientOnly>
          <PresaleCountdown />
        </ClientOnly>
      </body>
    </html>
  )
}
