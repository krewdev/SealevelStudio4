"use client";

import React, { useState, KeyboardEvent } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { useLocalAI } from "../hooks/useLocalAI";

interface CommandBarProps {
  onCommand: (command: string, response: string) => void;
  placeholder?: string;
}

export function CommandBar({ onCommand, placeholder = "Describe the interface you need..." }: CommandBarProps) {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { ask, isLoading, progress, isReady, initialize, error } = useLocalAI();

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;

    // Initialize AI if not ready
    if (!isReady && !isLoading) {
      await initialize();
      return;
    }

    if (!isReady) return;

    setIsProcessing(true);
    try {
      const response = await ask(input);
      onCommand(input, response);
      setInput("");
    } catch (error) {
      console.error("Command error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (isLoading) {
    return (
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
        <div className="glass-panel p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <div className="flex-1">
              <div className="text-sm font-medium text-white mb-1">Initializing Neural Engine</div>
              <div className="text-xs text-emerald-400 animate-pulse">{progress || "Loading..."}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
        <div className="glass-panel p-4 rounded-2xl bg-red-900/20 backdrop-blur-xl border border-red-500/30">
          <div className="text-sm text-red-300">{error}</div>
          <button
            onClick={initialize}
            className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
      <div className="glass-panel p-3 rounded-full flex gap-2 bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="flex items-center px-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
        </div>
        <input
          className="bg-transparent outline-none px-2 flex-1 text-sm text-white placeholder-gray-500"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing || !isReady}
        />
        <button
          onClick={handleSubmit}
          disabled={isProcessing || !isReady || !input.trim()}
          className="p-2 rounded-full bg-purple-600/30 hover:bg-purple-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-purple-400" />
          )}
        </button>
      </div>
      {!isReady && (
        <div className="mt-2 text-center">
          <button
            onClick={initialize}
            className="text-xs text-purple-400 hover:text-purple-300 underline"
          >
            Initialize AI Engine
          </button>
        </div>
      )}
    </div>
  );
}


