"use client";

import React from "react";
import { BleedingEdgeWrapper } from "./BleedingEdgeWrapper";
import { Sparkles, Zap, Cpu } from "lucide-react";
import { LogoWatermark } from "./LogoWatermark";

/**
 * Demo page showing the Bleeding Edge stack in action
 * Visit /bleeding-edge-demo to see this
 */
export function BleedingEdgeDemo() {
  return (
    <BleedingEdgeWrapper enabled={true}>
      <div className="min-h-screen p-8 relative">
        {/* Logo Watermark */}
        <LogoWatermark opacity={0.04} position="center right" scale={0.4} rotation={-5} />
        <div className="max-w-4xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="w-8 h-8 text-purple-400" />
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
                Bleeding Edge Stack
              </h1>
            </div>
            <p className="text-gray-400 text-lg">
              WebGPU + Local AI + Generative UI
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="WebGPU Engine"
              description="Cinema-quality 3D graphics running at 120fps in your browser"
            />
            <FeatureCard
              icon={<Cpu className="w-6 h-6" />}
              title="Local AI"
              description="Llama-3-8B running entirely in your browser. Zero latency, total privacy"
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="Generative UI"
              description="Tell the AI what you need, watch it build the interface in real-time"
            />
          </div>

          {/* Instructions */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Try It Out</h2>
            <div className="space-y-3 text-gray-300">
              <p>Type a command in the bar at the bottom:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>"Show me a swap interface for 5 SOL to USDC"</li>
                <li>"Create a dashboard for my token launches"</li>
                <li>"Display my wallet balance"</li>
                <li>"Build a transaction to transfer 10 SOL"</li>
              </ul>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Tech Stack</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-purple-400 font-medium mb-2">Rendering</div>
                <div className="text-gray-400">Three.js WebGPU Renderer</div>
              </div>
              <div>
                <div className="text-purple-400 font-medium mb-2">Intelligence</div>
                <div className="text-gray-400">@mlc-ai/web-llm (Llama-3-8B)</div>
              </div>
              <div>
                <div className="text-purple-400 font-medium mb-2">Framework</div>
                <div className="text-gray-400">Next.js 15 + React 19</div>
              </div>
              <div>
                <div className="text-purple-400 font-medium mb-2">Styling</div>
                <div className="text-gray-400">Tailwind CSS v4 + Glassmorphism</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BleedingEdgeWrapper>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <div className="text-purple-400 mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}


