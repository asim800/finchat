// ============================================================================
// FILE: tests/components/chat-history.test.ts
// Test suite for chat history navigation functionality
// ============================================================================

import { useChatHistory } from '../../hooks/useChatHistory';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock React hooks for testing
let mockState: any = {};
let mockSetters: Record<string, any> = {};

const mockUseState = (initialValue: any) => {
  const key = Math.random().toString();
  if (!(key in mockState)) {
    mockState[key] = initialValue;
  }
  const setter = (newValue: any) => {
    if (typeof newValue === 'function') {
      mockState[key] = newValue(mockState[key]);
    } else {
      mockState[key] = newValue;
    }
  };
  mockSetters[key] = setter;
  return [mockState[key], setter];
};

const mockUseCallback = (fn: any) => fn;
const mockUseRef = (initialValue: any) => ({ current: initialValue });
const mockUseEffect = (fn: any) => fn();

// Replace React hooks with mocks
jest.mock('react', () => ({
  useState: mockUseState,
  useCallback: mockUseCallback,
  useRef: mockUseRef,
  useEffect: mockUseEffect
}));

describe('Chat History Navigation', () => {
  
  beforeEach(() => {
    // Clear all mocks
    mockState = {};
    mockSetters = {};
    mockLocalStorage.clear();
  });

  describe('useChatHistory Hook', () => {
    
    test('should initialize with empty history', () => {
      const historyHook = useChatHistory();
      
      expect(historyHook.historyCount).toBe(0);
      expect(historyHook.getNavigationState().isNavigating).toBe(false);
      expect(historyHook.getNavigationState().historyLength).toBe(0);
    });

    test('should add messages to history', () => {
      const historyHook = useChatHistory();
      
      historyHook.addToHistory('What is my portfolio performance?');
      historyHook.addToHistory('Analyze my risk exposure');
      
      expect(historyHook.historyCount).toBe(2);
      expect(historyHook.getRecentHistory(5)).toHaveLength(2);
    });

    test('should not add duplicate consecutive messages', () => {
      const historyHook = useChatHistory();
      
      historyHook.addToHistory('Same message');
      historyHook.addToHistory('Same message');
      
      expect(historyHook.historyCount).toBe(1);
    });

    test('should not add empty messages', () => {
      const historyHook = useChatHistory();
      
      historyHook.addToHistory('');
      historyHook.addToHistory('   ');
      historyHook.addToHistory('Valid message');
      
      expect(historyHook.historyCount).toBe(1);
    });

    test('should respect maxHistorySize limit', () => {
      const historyHook = useChatHistory({ maxHistorySize: 3 });
      
      historyHook.addToHistory('Message 1');
      historyHook.addToHistory('Message 2');
      historyHook.addToHistory('Message 3');
      historyHook.addToHistory('Message 4');
      
      expect(historyHook.historyCount).toBe(3);
      expect(historyHook.getRecentHistory(5)[0].message).toBe('Message 4');
    });
  });

  describe('History Navigation', () => {
    
    test('should navigate up through history', () => {
      const historyHook = useChatHistory();
      
      historyHook.addToHistory('First message');
      historyHook.addToHistory('Second message');
      historyHook.addToHistory('Third message');
      
      // Navigate up from empty input
      const result1 = historyHook.navigateHistory('up', '');
      expect(result1).toBe('Third message');
      
      // Navigate up to older message
      const result2 = historyHook.navigateHistory('up', 'Third message');
      expect(result2).toBe('Second message');
      
      // Navigate up to oldest message
      const result3 = historyHook.navigateHistory('up', 'Second message');
      expect(result3).toBe('First message');
      
      // Try to navigate past oldest (should stay)
      const result4 = historyHook.navigateHistory('up', 'First message');
      expect(result4).toBe('First message');
    });

    test('should navigate down through history', () => {
      const historyHook = useChatHistory();
      
      historyHook.addToHistory('First message');
      historyHook.addToHistory('Second message');
      historyHook.addToHistory('Third message');
      
      // Start navigation
      historyHook.navigateHistory('up', '');
      historyHook.navigateHistory('up', 'Third message');
      
      // Navigate down to newer message
      const result1 = historyHook.navigateHistory('down', 'Second message');
      expect(result1).toBe('Third message');
      
      // Navigate down to current input (should return stored input)
      const result2 = historyHook.navigateHistory('down', 'Third message');
      expect(result2).toBe(''); // Should return the original empty input
    });

    test('should handle navigation with no history', () => {
      const historyHook = useChatHistory();
      
      const result1 = historyHook.navigateHistory('up', 'current input');
      expect(result1).toBe('current input');
      
      const result2 = historyHook.navigateHistory('down', 'current input');
      expect(result2).toBe('current input');
    });

    test('should preserve temporary input during navigation', () => {
      const historyHook = useChatHistory();
      
      historyHook.addToHistory('Historical message');
      
      // Start with some input
      const currentInput = 'Work in progress';
      
      // Navigate up (should store current input)
      const result1 = historyHook.navigateHistory('up', currentInput);
      expect(result1).toBe('Historical message');
      
      // Navigate back down (should restore original input)
      const result2 = historyHook.navigateHistory('down', 'Historical message');
      expect(result2).toBe(currentInput);
    });
  });

  describe('Navigation State', () => {
    
    test('should track navigation state correctly', () => {
      const historyHook = useChatHistory();
      
      historyHook.addToHistory('Message 1');
      historyHook.addToHistory('Message 2');
      
      // Initially not navigating
      let state = historyHook.getNavigationState();
      expect(state.isNavigating).toBe(false);
      expect(state.currentIndex).toBe(-1);
      expect(state.canGoUp).toBe(true);
      expect(state.canGoDown).toBe(false);
      
      // After navigating up
      historyHook.navigateHistory('up', '');
      state = historyHook.getNavigationState();
      expect(state.isNavigating).toBe(true);
      expect(state.currentIndex).toBe(1);
      expect(state.canGoUp).toBe(true);
      expect(state.canGoDown).toBe(true);
    });
  });

  describe('Persistence', () => {
    
    test('should save and load history from localStorage', () => {
      const storageKey = 'test-chat-history';
      
      // Create first instance and add history
      const historyHook1 = useChatHistory({ 
        storageKey,
        enablePersistence: true 
      });
      
      historyHook1.addToHistory('Persistent message 1');
      historyHook1.addToHistory('Persistent message 2');
      
      // Verify localStorage was used
      const stored = mockLocalStorage.getItem(storageKey);
      expect(stored).toBeTruthy();
      
      // Create second instance (simulating page reload)
      const historyHook2 = useChatHistory({ 
        storageKey,
        enablePersistence: true 
      });
      
      // Should have loaded from localStorage
      expect(historyHook2.historyCount).toBe(2);
      const recentHistory = historyHook2.getRecentHistory(5);
      expect(recentHistory[0].message).toBe('Persistent message 2');
      expect(recentHistory[1].message).toBe('Persistent message 1');
    });

    test('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw errors
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = () => {
        throw new Error('Storage quota exceeded');
      };
      
      const historyHook = useChatHistory({ enablePersistence: true });
      
      // Should not throw error when adding to history
      expect(() => {
        historyHook.addToHistory('Test message');
      }).not.toThrow();
      
      // Restore original function
      mockLocalStorage.setItem = originalSetItem;
    });
  });

  describe('Clear History', () => {
    
    test('should clear all history and reset state', () => {
      const historyHook = useChatHistory();
      
      historyHook.addToHistory('Message 1');
      historyHook.addToHistory('Message 2');
      historyHook.navigateHistory('up', '');
      
      historyHook.clearHistory();
      
      expect(historyHook.historyCount).toBe(0);
      expect(historyHook.getNavigationState().isNavigating).toBe(false);
      expect(historyHook.getNavigationState().currentIndex).toBe(-1);
    });

    test('should clear localStorage when clearing history', () => {
      const storageKey = 'test-clear-history';
      const historyHook = useChatHistory({ 
        storageKey,
        enablePersistence: true 
      });
      
      historyHook.addToHistory('Message to be cleared');
      
      // Verify it was stored
      expect(mockLocalStorage.getItem(storageKey)).toBeTruthy();
      
      historyHook.clearHistory();
      
      // Verify it was removed
      expect(mockLocalStorage.getItem(storageKey)).toBeNull();
    });
  });

  describe('Recent History', () => {
    
    test('should return recent history in reverse chronological order', () => {
      const historyHook = useChatHistory();
      
      historyHook.addToHistory('Oldest');
      historyHook.addToHistory('Middle');
      historyHook.addToHistory('Newest');
      
      const recent = historyHook.getRecentHistory(3);
      
      expect(recent).toHaveLength(3);
      expect(recent[0].message).toBe('Newest');
      expect(recent[1].message).toBe('Middle');
      expect(recent[2].message).toBe('Oldest');
    });

    test('should limit recent history to specified count', () => {
      const historyHook = useChatHistory();
      
      for (let i = 1; i <= 10; i++) {
        historyHook.addToHistory(`Message ${i}`);
      }
      
      const recent = historyHook.getRecentHistory(5);
      
      expect(recent).toHaveLength(5);
      expect(recent[0].message).toBe('Message 10');
      expect(recent[4].message).toBe('Message 6');
    });
  });

  describe('Edge Cases', () => {
    
    test('should handle rapid navigation changes', () => {
      const historyHook = useChatHistory();
      
      historyHook.addToHistory('Message 1');
      historyHook.addToHistory('Message 2');
      historyHook.addToHistory('Message 3');
      
      // Rapid up navigation
      let result = historyHook.navigateHistory('up', '');
      result = historyHook.navigateHistory('up', result);
      result = historyHook.navigateHistory('up', result);
      
      expect(result).toBe('Message 1');
      
      // Rapid down navigation
      result = historyHook.navigateHistory('down', result);
      result = historyHook.navigateHistory('down', result);
      result = historyHook.navigateHistory('down', result);
      
      expect(result).toBe('');
    });

    test('should handle special characters in messages', () => {
      const historyHook = useChatHistory();
      
      const specialMessage = 'What is 50% of $1,000? #investment @portfolio';
      historyHook.addToHistory(specialMessage);
      
      const result = historyHook.navigateHistory('up', '');
      expect(result).toBe(specialMessage);
    });

    test('should handle very long messages', () => {
      const historyHook = useChatHistory();
      
      const longMessage = 'A'.repeat(10000);
      historyHook.addToHistory(longMessage);
      
      const result = historyHook.navigateHistory('up', '');
      expect(result).toBe(longMessage);
      expect(result).toHaveLength(10000);
    });
  });
});

// Integration test utilities
export class ChatHistoryTestUtils {
  
  static simulateKeyboardNavigation(
    historyHook: ReturnType<typeof useChatHistory>,
    sequence: Array<{ key: 'up' | 'down'; currentInput: string }>
  ): string[] {
    const results: string[] = [];
    
    sequence.forEach(({ key, currentInput }) => {
      const result = historyHook.navigateHistory(key, currentInput);
      results.push(result);
    });
    
    return results;
  }
  
  static createTestHistory(
    historyHook: ReturnType<typeof useChatHistory>,
    messages: string[]
  ): void {
    messages.forEach(message => {
      historyHook.addToHistory(message);
    });
  }
  
  static verifyNavigationSequence(
    historyHook: ReturnType<typeof useChatHistory>,
    testMessages: string[],
    expectedSequence: string[]
  ): boolean {
    this.createTestHistory(historyHook, testMessages);
    
    let currentInput = '';
    const actualSequence: string[] = [];
    
    // Navigate up through all messages
    for (let i = 0; i < testMessages.length; i++) {
      currentInput = historyHook.navigateHistory('up', currentInput);
      actualSequence.push(currentInput);
    }
    
    // Navigate back down
    for (let i = 0; i < testMessages.length; i++) {
      currentInput = historyHook.navigateHistory('down', currentInput);
      actualSequence.push(currentInput);
    }
    
    return JSON.stringify(actualSequence) === JSON.stringify(expectedSequence);
  }
}

export default ChatHistoryTestUtils;