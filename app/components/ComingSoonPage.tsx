'use client';

import React from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ComingSoonPageProps {
  title: string;
  description: string;
  eta?: string;
}

export default function ComingSoonPage({ title, description, eta = 'Q3 2025' }: ComingSoonPageProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center relative">
      {/* Transparent Logo Watermark */}
      <img
        src="/sea-level-logo.png"
        alt="Sealevel Studio Background"
        className="absolute inset-0 w-full h-full object-contain opacity-[0.05] filter hue-rotate-[90deg] saturate-75 brightness-110"
        style={{
          objectPosition: 'center right',
          transform: 'scale(0.6) rotate(-5deg)',
        }}
      />
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative z-10">
        <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-purple-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <div className="inline-block px-3 py-1 bg-purple-900/50 text-purple-300 text-xs font-medium rounded-full mb-4 border border-purple-700/50">
          Coming Soon
        </div>
        
        <p className="text-gray-400 mb-8">
          {description}
        </p>

        {eta && (
          <div className="bg-gray-900/50 rounded-lg p-4 mb-8 border border-gray-700">
            <span className="text-gray-500 text-sm uppercase tracking-wider font-semibold">Estimated Launch</span>
            <div className="text-white font-medium mt-1">{eta}</div>
          </div>
        )}

        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-full gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
        >
          <ArrowLeft size={18} />
          Go Back
        </button>
      </div>
    </div>
  );
}

