'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TutorialState {
  accountInspector: boolean;
  instructionAssembler: boolean;
  simulation: boolean;
  exporter: boolean;
}

interface TutorialContextType {
  tutorials: TutorialState;
  completeTutorial: (section: keyof TutorialState) => void;
  resetTutorials: () => void;
  shouldShowTutorial: (section: keyof TutorialState) => boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const STORAGE_KEY = 'sealevel-studio-tutorials';

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [tutorials, setTutorials] = useState<TutorialState>({
    accountInspector: false,
    instructionAssembler: false,
    simulation: false,
    exporter: false,
  });

  // Load tutorial state from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setTutorials(prev => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.warn('Failed to parse tutorial state:', error);
      }
    }
  }, []);

  // Save tutorial state to localStorage whenever it changes (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tutorials));
      } catch (error) {
        console.warn('Failed to save tutorial state:', error);
      }
    }
  }, [tutorials]);

  const completeTutorial = (section: keyof TutorialState) => {
    setTutorials(prev => ({ ...prev, [section]: true }));
  };

  const resetTutorials = () => {
    setTutorials({
      accountInspector: false,
      instructionAssembler: false,
      simulation: false,
      exporter: false,
    });
  };

  const shouldShowTutorial = (section: keyof TutorialState): boolean => {
    // Show tutorial if user hasn't completed it yet
    return !tutorials[section];
  };

  return (
    <TutorialContext.Provider value={{
      tutorials,
      completeTutorial,
      resetTutorials,
      shouldShowTutorial,
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
