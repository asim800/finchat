// ============================================================================
// FILE: hooks/useChatHistory.ts
// Custom hook for managing chat history navigation with up/down arrows
// ============================================================================

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface ChatHistoryEntry {
  message: string;
  timestamp: Date;
}

interface UseChatHistoryOptions {
  maxHistorySize?: number;
  storageKey?: string;
  enablePersistence?: boolean;
}

export const useChatHistory = (options: UseChatHistoryOptions = {}) => {
  const {
    maxHistorySize = 50,
    storageKey = 'chat-history',
    enablePersistence = true
  } = options;

  // Chat history state
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [temporaryInput, setTemporaryInput] = useState('');
  
  // Ref to track if we're navigating (to distinguish from user typing)
  const isNavigatingRef = useRef(false);

  // Load history from localStorage on mount
  useEffect(() => {
    if (!enablePersistence || typeof window === 'undefined') return;
    
    try {
      const savedHistory = localStorage.getItem(storageKey);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Convert timestamp strings back to Date objects
        const historyWithDates = parsed.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        setHistory(historyWithDates);
      }
    } catch (error) {
      console.warn('Failed to load chat history from localStorage:', error);
    }
  }, [storageKey, enablePersistence]);

  // Save history to localStorage when it changes
  useEffect(() => {
    if (!enablePersistence || typeof window === 'undefined' || history.length === 0) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to save chat history to localStorage:', error);
    }
  }, [history, storageKey, enablePersistence]);

  // Add a new message to history
  const addToHistory = useCallback((message: string) => {
    if (!message.trim()) return;

    const newEntry: ChatHistoryEntry = {
      message: message.trim(),
      timestamp: new Date()
    };

    setHistory(prev => {
      // Avoid duplicates - don't add if the last message is identical
      if (prev.length > 0 && prev[prev.length - 1].message === newEntry.message) {
        return prev;
      }

      // Add new entry and trim to maxHistorySize
      const newHistory = [...prev, newEntry];
      if (newHistory.length > maxHistorySize) {
        return newHistory.slice(-maxHistorySize);
      }
      return newHistory;
    });

    // Reset navigation state
    setCurrentIndex(-1);
    setTemporaryInput('');
  }, [maxHistorySize]);

  // Navigate through history
  const navigateHistory = useCallback((direction: 'up' | 'down', currentInput: string) => {
    isNavigatingRef.current = true;

    if (history.length === 0) {
      return currentInput; // No history to navigate
    }

    let newIndex = currentIndex;

    if (direction === 'up') {
      if (currentIndex === -1) {
        // Starting navigation - store current input and go to most recent
        setTemporaryInput(currentInput);
        newIndex = history.length - 1;
      } else if (currentIndex > 0) {
        // Move to older message
        newIndex = currentIndex - 1;
      } else {
        // Already at oldest, stay there
        return history[0].message;
      }
    } else { // direction === 'down'
      if (currentIndex === -1) {
        // Not navigating, return current input
        return currentInput;
      } else if (currentIndex < history.length - 1) {
        // Move to newer message
        newIndex = currentIndex + 1;
      } else {
        // At newest, return to current input
        setCurrentIndex(-1);
        const temp = temporaryInput;
        setTemporaryInput('');
        // Use setTimeout to reset navigation flag after state update
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 0);
        return temp;
      }
    }

    setCurrentIndex(newIndex);
    
    // Use setTimeout to reset navigation flag after state update
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 0);

    return history[newIndex].message;
  }, [history, currentIndex, temporaryInput]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    setTemporaryInput('');
    
    if (enablePersistence && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn('Failed to clear chat history from localStorage:', error);
      }
    }
  }, [storageKey, enablePersistence]);

  // Get current navigation state
  const getNavigationState = useCallback(() => {
    return {
      isNavigating: currentIndex !== -1,
      currentIndex,
      historyLength: history.length,
      canGoUp: history.length > 0 && (currentIndex === -1 || currentIndex > 0),
      canGoDown: currentIndex > 0 || (currentIndex === 0 && history.length > 1)
    };
  }, [currentIndex, history.length]);

  // Get recent history for display
  const getRecentHistory = useCallback((limit: number = 10) => {
    return history.slice(-limit).reverse(); // Most recent first
  }, [history]);

  // Check if currently navigating (to prevent input updates during navigation)
  const isNavigating = useCallback(() => {
    return isNavigatingRef.current;
  }, []);

  return {
    // Core functionality
    addToHistory,
    navigateHistory,
    clearHistory,
    
    // State getters
    getNavigationState,
    getRecentHistory,
    isNavigating,
    
    // Direct state access
    history,
    currentIndex,
    
    // Statistics
    historyCount: history.length
  };
};

export default useChatHistory;