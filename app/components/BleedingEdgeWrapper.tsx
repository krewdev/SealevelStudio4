"use client";

import React, { useState, useCallback } from "react";
import WebGPUScene from "./WebGPUScene";
import { CommandBar } from "./CommandBar";
import { GenerativeUI } from "./GenerativeUI";

interface UIComponent {
  id: string;
  type: string;
  config: any;
  timestamp: number;
}

interface BleedingEdgeWrapperProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export function BleedingEdgeWrapper({ children, enabled = true }: BleedingEdgeWrapperProps) {
  const [components, setComponents] = useState<UIComponent[]>([]);

  const handleCommand = useCallback((command: string, response: string) => {
    // Parse AI response to determine component type
    let componentType = "dashboard";
    let config: any = {};

    // Simple intent parsing (in production, use more sophisticated NLP)
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes("swap") || lowerCommand.includes("trade")) {
      componentType = "swap_card";
      const amountMatch = command.match(/(\d+\.?\d*)\s*(SOL|USDC|ETH)/i);
      const tokensMatch = command.match(/(SOL|USDC|ETH|BTC)/gi);
      config = {
        amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
        tokens: tokensMatch ? tokensMatch.slice(0, 2) : ["SOL", "USDC"],
      };
    } else if (lowerCommand.includes("wallet") || lowerCommand.includes("balance")) {
      componentType = "wallet_balance";
    } else if (lowerCommand.includes("transaction") || lowerCommand.includes("build")) {
      componentType = "transaction_builder";
      config = { type: "Transfer" };
    } else if (lowerCommand.includes("dashboard")) {
      componentType = "dashboard";
    }

    // Add new component
    const newComponent: UIComponent = {
      id: `component-${Date.now()}`,
      type: componentType,
      config,
      timestamp: Date.now(),
    };

    setComponents((prev) => [...prev, newComponent]);
  }, []);

  const handleCloseComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full h-full">
      {/* Layer 0: WebGPU Background */}
      <WebGPUScene intensity={0.2} particleCount={500} color="#8b5cf6" />

      {/* Layer 1: Existing App Content (with reduced opacity for glassmorphism effect) */}
      <div className="relative z-10">{children}</div>

      {/* Layer 2: Generative UI Components */}
      <GenerativeUI components={components} onClose={handleCloseComponent} />

      {/* Layer 3: Command Bar */}
      <CommandBar onCommand={handleCommand} />
    </div>
  );
}


