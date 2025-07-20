// ============================================================================
// FILE: hooks/useScrollManager.ts
// Consolidated scroll management for chat interface
// ============================================================================

import { useRef, useCallback, useEffect, useMemo } from 'react';

// Throttle utility function
const throttle = <T extends (...args: any[]) => any>(func: T, delay: number): T => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return ((...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  }) as T;
};

interface UseScrollManagerProps {
  messages: any[];
  isInitiallyLoaded: boolean;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export const useScrollManager = ({
  messages,
  isInitiallyLoaded,
  hasMoreMessages,
  isLoadingMore,
  onLoadMore
}: UseScrollManagerProps) => {
  // Refs for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll state tracking
  const lastMessageCount = useRef(0);
  const shouldAutoScroll = useRef(true);

  /**
   * Scrolls the chat to the bottom with fallback mechanisms
   */
  const scrollToBottom = useCallback(() => {
    // Primary method: scrollIntoView
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } catch (error) {
        console.warn('Error scrolling to bottom with scrollIntoView:', error);
      }
    }
    
    // Fallback: manual scroll to bottom
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      setTimeout(() => {
        try {
          if (container && typeof container.scrollHeight === 'number') {
            container.scrollTop = container.scrollHeight;
          }
        } catch (error) {
          console.warn('Error scrolling to bottom manually:', error);
        }
      }, 100);
    }
  }, []);

  /**
   * Handles scroll events to trigger load more and track user position
   */
  const handleScrollEvent = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    
    // Safety check for container properties
    if (!container || 
        typeof container.scrollTop !== 'number' || 
        typeof container.scrollHeight !== 'number' || 
        typeof container.clientHeight !== 'number') {
      return;
    }
    
    // Trigger load more when scrolled to top
    const isAtTop = container.scrollTop <= 10;
    const canLoadMore = hasMoreMessages && !isLoadingMore && messages.length > 0 && isInitiallyLoaded;
    
    if (isAtTop && canLoadMore) {
      onLoadMore();
    }
    
    // Track if user is near bottom for auto-scroll behavior
    const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    shouldAutoScroll.current = isNearBottom;
  }, [hasMoreMessages, isLoadingMore, messages.length, isInitiallyLoaded, onLoadMore]);

  /**
   * Throttled scroll handler for performance
   */
  const throttledScrollHandler = useMemo(
    () => throttle(handleScrollEvent, 100),
    [handleScrollEvent]
  );

  /**
   * Auto-scroll effect when new messages are added
   */
  useEffect(() => {
    // Only auto-scroll when messages are added (not when loading history)
    const messagesAdded = messages.length > lastMessageCount.current;
    if (!messagesAdded) {
      lastMessageCount.current = messages.length;
      return;
    }

    const container = messagesContainerRef.current;
    if (!container || 
        typeof container.scrollHeight !== 'number' || 
        typeof container.scrollTop !== 'number' || 
        typeof container.clientHeight !== 'number') {
      lastMessageCount.current = messages.length;
      return;
    }

    try {
      const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
      
      // Auto-scroll conditions:
      // 1. User was near the bottom
      // 2. Initial load
      // 3. User sent a message (shouldAutoScroll is true)
      const shouldScroll = wasAtBottom || !isInitiallyLoaded || shouldAutoScroll.current;
      
      if (shouldScroll) {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }
    } catch (error) {
      console.warn('Error in auto-scroll effect:', error);
    }

    lastMessageCount.current = messages.length;
  }, [messages, isInitiallyLoaded, scrollToBottom]);

  /**
   * Enable auto-scroll (typically called when user sends a message)
   */
  const enableAutoScroll = useCallback(() => {
    shouldAutoScroll.current = true;
  }, []);

  return {
    messagesEndRef,
    messagesContainerRef,
    scrollToBottom,
    handleScroll: throttledScrollHandler,
    enableAutoScroll
  };
};