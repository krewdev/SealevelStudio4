"use client";

import { useState, useEffect, useCallback } from "react";

interface LocalAIState {
  isLoading: boolean;
  progress: string;
  isReady: boolean;
  error: string | null;
}

interface UseLocalAIReturn {
  ask: (prompt: string) => Promise<string>;
  isLoading: boolean;
  progress: string;
  isReady: boolean;
  error: string | null;
  initialize: () => Promise<void>;
}

// LM Studio default endpoint (OpenAI-compatible API)
const LM_STUDIO_ENDPOINT = process.env.NEXT_PUBLIC_LM_STUDIO_ENDPOINT || "http://localhost:1234/v1";

export function useLocalAI(): UseLocalAIReturn {
  const [state, setState] = useState<LocalAIState>({
    isLoading: false,
    progress: "",
    isReady: false,
    error: null,
  });

  const [isInitialized, setIsInitialized] = useState(false);

  const initialize = useCallback(async () => {
    if (isInitialized || state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true, progress: "Connecting to LM Studio..." }));

    try {
      // Test connection to LM Studio
      setState(prev => ({ ...prev, progress: "Checking LM Studio connection..." }));

      const testResponse = await fetch(`${LM_STUDIO_ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'local-model', // LM Studio uses the loaded model
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        throw new Error(`LM Studio connection failed: ${testResponse.status} - ${errorText}. Make sure LM Studio is running with a model loaded.`);
      }

      setIsInitialized(true);
      setState({
        isLoading: false,
        progress: "Connected to LM Studio!",
        isReady: true,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to LM Studio";
      setState({
        isLoading: false,
        progress: "",
        isReady: false,
        error: errorMessage,
      });
      console.error("LM Studio initialization error:", error);
    }
  }, [isInitialized, state.isLoading]);

  const ask = useCallback(async (prompt: string): Promise<string> => {
    if (!isInitialized) {
      return "AI not initialized. Please wait for initialization to complete.";
    }

    try {
      // Call LM Studio's OpenAI-compatible API
      const response = await fetch(`${LM_STUDIO_ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'local-model', // LM Studio uses the currently loaded model
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Handle OpenAI-compatible response format
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content || "No response from AI";
      }

      return "No response from AI";
    } catch (error) {
      console.error("AI error:", error);
      return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }, [isInitialized]);

  // Auto-initialize on mount (optional - can be manual)
  useEffect(() => {
    // Uncomment to auto-initialize:
    // initialize();
  }, []);

  return {
    ask,
    isLoading: state.isLoading,
    progress: state.progress,
    isReady: state.isReady,
    error: state.error,
    initialize,
  };
}

