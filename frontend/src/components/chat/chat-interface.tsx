// ============================================================================
// FILE: components/chat/chat-interface.tsx (UPDATED)
// Updated chat interface with provider selection and fallback
// ============================================================================

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageBubble, Message } from './message-bubble';
import { ChartDisplay } from './chart-display';
import { FileProcessor } from './file-processor';
import { useChatAPI } from '@/hooks/use-chat-api';
import { useScrollManager } from '@/hooks/useScrollManager';
import { useChatHistory } from '@/hooks/useChatHistory';
import { simulateAIResponse } from '@/lib/chat-simulation';
import { generateGuestSessionId, GuestPortfolioService } from '@/lib/guest-portfolio';
import { conversationAnalytics, trackChatMessage, trackChatResponse } from '@/lib/conversation-analytics';
import { GuestModeIndicator } from '@/components/ui/guest-mode-indicator';

interface ChatInterfaceProps {
  isGuestMode?: boolean;
  userId?: string;
  onChartUpdate?: (chartData: { type: 'pie' | 'bar'; title: string; data: Array<{ name: string; value: number }> } | null) => void;
  hideInlineCharts?: boolean;
}

const ChatInterfaceComponent: React.FC<ChatInterfaceProps> = ({ isGuestMode = false, userId, onChartUpdate, hideInlineCharts = false }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isInitiallyLoaded, setIsInitiallyLoaded] = useState(false);
  const hasInitialized = useRef(false);
  
  const [inputValue, setInputValue] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadedData, setUploadedData] = useState<{
    type: 'portfolio' | 'preferences' | 'text' | 'generic';
    holdings?: Array<{ symbol: string; [key: string]: unknown }>;
    totalValue?: number;
    settings?: Record<string, string>;
    keywords?: string[];
    [key: string]: unknown;
  } | null>(null);
  const [selectedProvider] = useState<'anthropic' | 'openai'>('openai');
  const [guestSessionId] = useState<string>(() => generateGuestSessionId());
  
  const { sendMessage, loadLatestSession, loadMoreMessages, isLoading } = useChatAPI();
  
  // Chat history navigation hook
  const {
    addToHistory,
    navigateHistory,
    getNavigationState,
    isNavigating
  } = useChatHistory({
    maxHistorySize: 100,
    storageKey: `chat-history-${isGuestMode ? guestSessionId : userId || 'default'}`,
    enablePersistence: true
  });

  // Load more messages handler for scroll manager
  const handleLoadMore = useCallback(async () => {
    if (!currentSessionId || isLoadingMore || !hasMoreMessages || messages.length === 0) {
      return;
    }

    setIsLoadingMore(true);
    
    try {
      const oldestMessage = messages[0];
      
      const moreMessages = await loadMoreMessages(
        currentSessionId,
        oldestMessage.id,
        10, // Load 10 more messages
        isGuestMode ? guestSessionId : undefined
      );

      if (moreMessages && moreMessages.length > 0) {
        // Store current scroll position
        const container = messagesContainerRef.current;
        const scrollTop = container?.scrollTop || 0;
        const scrollHeight = container?.scrollHeight || 0;

        // Add new messages to the beginning
        setMessages(prev => [...moreMessages, ...prev]);

        // Restore scroll position (maintain user's position)
        setTimeout(() => {
          if (container && typeof container.scrollHeight === 'number' && typeof container.scrollTop === 'number') {
            try {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = scrollTop + (newScrollHeight - scrollHeight);
            } catch (error) {
              console.warn('Error restoring scroll position:', error);
            }
          }
        }, 0);

        // Check if we got fewer messages than requested (indicates no more messages)
        if (moreMessages.length < 10) {
          setHasMoreMessages(false);
        }
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentSessionId, isLoadingMore, hasMoreMessages, messages, loadMoreMessages, isGuestMode, guestSessionId]);

  // Scroll management hook
  const {
    messagesEndRef,
    messagesContainerRef,
    handleScroll,
    enableAutoScroll
  } = useScrollManager({
    messages,
    isInitiallyLoaded,
    hasMoreMessages,
    isLoadingMore,
    onLoadMore: handleLoadMore
  });

  // Memoized initialization function
  const initializeSession = useCallback(async () => {
    // Only run once per component lifecycle
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    try {
      // Try to load the latest session
      const latestSession = await loadLatestSession(isGuestMode, isGuestMode ? guestSessionId : undefined);
      
      if (latestSession && latestSession.messages.length > 0) {
        // Load existing chat history
        setMessages(latestSession.messages);
        setCurrentSessionId(latestSession.sessionId);
        
        // Assume there are more messages unless we know otherwise
        setHasMoreMessages(true);
        
        // Mark as initially loaded after a small delay to prevent immediate scroll triggers
        setTimeout(() => {
          setIsInitiallyLoaded(true);
        }, 500);
        
        // Find the most recent chart data in the loaded messages
        const messagesWithCharts = latestSession.messages.filter(msg => msg.chartData);
        if (messagesWithCharts.length > 0 && onChartUpdate) {
          const latestChartMessage = messagesWithCharts[messagesWithCharts.length - 1];
          if (latestChartMessage.chartData) {
            onChartUpdate(latestChartMessage.chartData);
          }
        }
      } else {
        // No existing session or empty session, show welcome message
        const welcomeMessage: Message = {
          id: '1',
          role: 'assistant',
          content: 'Portfolio Insights?',
          timestamp: new Date(),
          provider: 'simulation'
        };
        
        setMessages([welcomeMessage]);
        setTimeout(() => {
          setIsInitiallyLoaded(true);
        }, 500);
      }
    } catch (error) {
      console.error('Error initializing chat session:', error);
      
      // Fallback to welcome message
      const welcomeMessage: Message = {
        id: '1',
        role: 'assistant',
        content: 'Portfolio Insights?',
        timestamp: new Date(),
        provider: 'simulation'
      };
      
      setMessages([welcomeMessage]);
      setTimeout(() => {
        setIsInitiallyLoaded(true);
      }, 500);
    }
  }, [isGuestMode, guestSessionId, loadLatestSession, onChartUpdate]);

  // Initialize chat session - load existing history or show welcome message
  useEffect(() => {
    initializeSession();
  }, [initializeSession]); // Include memoized initializeSession


  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Generate unique request ID for this conversation
    const requestId = conversationAnalytics.generateRequestId();
    const sessionId = currentSessionId || guestSessionId;

    // Track the start of this conversation thread
    trackChatMessage(
      requestId,
      sessionId,
      inputValue.trim(),
      userId,
      isGuestMode ? guestSessionId : undefined
    );

    // Enable auto-scroll when user sends a message
    enableAutoScroll();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    
    // Add message to history for navigation
    addToHistory(currentInput);
    
    setInputValue('');

    try {
      // Try API first
      const response = await sendMessage(currentInput, {
        provider: selectedProvider,
        portfolioData: uploadedData || undefined,
        sessionId: currentSessionId || undefined,
        guestSessionId: isGuestMode ? guestSessionId : undefined,
        requestId, // Pass the request ID for tracking
      });

      if (response) {
        console.log(`✅ Response from: ${response.provider}`); // Debug log
        setMessages(prev => [...prev, response]);
        
        // Track successful chat response
        trackChatResponse(requestId, response.content, true);
        
        // Update chart panel if chart data is available
        if (response.chartData && onChartUpdate) {
          onChartUpdate(response.chartData);
        }
        
        // Update session ID if this is a new session
        if (response.sessionId && !currentSessionId) {
          setCurrentSessionId(response.sessionId);
        }
      } else {
        throw new Error('API response failed');
      }
      
    } catch (apiError) {
      console.log('API failed, falling back to simulation:', apiError);
      
      // Track API error
      conversationAnalytics.logEvent({
        id: conversationAnalytics.generateRequestId(),
        requestId,
        sessionId,
        userId,
        guestSessionId: isGuestMode ? guestSessionId : undefined,
        timestamp: new Date(),
        eventType: 'error_occurred',
        severity: 'warning',
        error: apiError instanceof Error ? apiError.message : 'API call failed',
        metadata: { fallbackToSimulation: true }
      });
      
      // Fallback to simulation
      try {
        const simulationResponse = await simulateAIResponse(
          currentInput, 
          isGuestMode, 
          uploadedData ? {
            ...uploadedData,
            holdings: uploadedData.holdings?.map(h => ({
              ...h,
              symbol: h.symbol,
              quantity: (h.quantity as number) || 0,
              price: (h.price as number) || 0
            }))
          } : undefined,
          userId,
          guestSessionId
        );
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: simulationResponse.content,
          timestamp: new Date(),
          provider: 'simulation',
          chartData: simulationResponse.chartData,
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Track simulation response
        trackChatResponse(requestId, simulationResponse.content, true);
        
        // Update chart panel if chart data is available from simulation
        if (simulationResponse.chartData && onChartUpdate) {
          onChartUpdate(simulationResponse.chartData);
        }
        
      } catch (simulationError) {
        console.error('Both API and simulation failed:', simulationError);
        
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
          provider: 'simulation',
        };
        setMessages(prev => [...prev, errorMessage]);
        
        // Track complete failure
        trackChatResponse(requestId, 'Error: System failure', false);
      }
    }
  };

  const handleFileDataExtracted = (data: {
    type: 'portfolio' | 'preferences' | 'text' | 'generic';
    holdings?: Array<{ symbol: string; [key: string]: unknown }>;
    totalValue?: number;
    settings?: Record<string, string>;
    keywords?: string[];
    [key: string]: unknown;
  }, summary: string) => {
    setUploadedData(data);
    
    // If this is portfolio data and we're in guest mode, automatically add to guest portfolio
    if (isGuestMode && data.type === 'portfolio' && data.holdings && data.holdings.length > 0) {
      try {
        // Convert holdings to the format expected by GuestPortfolioService
        const assetsToAdd = data.holdings.map(holding => ({
          symbol: String(holding.symbol),
          quantity: Number(holding.quantity) || 0,
          avgCost: Number(holding.price) || undefined, // Use 'price' as avgCost
          assetType: 'stock' as const // Default to stock type
        })).filter(asset => asset.symbol && asset.quantity > 0);
        
        if (assetsToAdd.length > 0) {
          const result = GuestPortfolioService.addAssetsToGuestPortfolio(guestSessionId, assetsToAdd);
          if (result.success) {
            console.log(`Successfully added ${assetsToAdd.length} assets to guest portfolio`);
          } else {
            console.warn('Failed to add some assets to guest portfolio:', result.errors);
          }
        }
      } catch (error) {
        console.error('Error adding uploaded portfolio to guest portfolio:', error);
      }
    }
    
    // Enable auto-scroll when adding file message
    enableAutoScroll();
    
    const fileMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Great! I've processed your uploaded file. ${summary}\n\n${isGuestMode && data.type === 'portfolio' ? "I've also added these holdings to your portfolio! You can view them on the Portfolio tab.\n\n" : ""}I can now provide insights based on this data. Try asking me questions like:\n• "Analyze my portfolio allocation"\n• "What are my risk exposures?"\n• "How can I improve my portfolio?"`,
      timestamp: new Date(),
      provider: 'simulation',
      fileData: data
    };
    
    setMessages(prev => [...prev, fileMessage]);
    setShowFileUpload(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newValue = navigateHistory('up', inputValue);
      setInputValue(newValue);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = navigateHistory('down', inputValue);
      setInputValue(newValue);
    }
  };

  const handleSampleQuestion = (question: string) => {
    setInputValue(question);
    // Enable auto-scroll when user selects a sample question
    enableAutoScroll();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Minimalist Header */}
      <div className="flex justify-between items-center p-2 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          {!isGuestMode && (
            <>
              <button
                onClick={() => handleSampleQuestion("Analyze my portfolio performance")}
                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
              >
                Portfolio Analysis
              </button>
              <button
                onClick={() => handleSampleQuestion("Show me market trends")}
                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
              >
                Market Trends
              </button>
            </>
          )}
          {isGuestMode && (
            <>
              <button
                onClick={() => handleSampleQuestion("What's the difference between stocks and bonds?")}
                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
              >
                Stocks vs Bonds
              </button>
              <button
                onClick={() => handleSampleQuestion("Show me a sample portfolio allocation chart")}
                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
              >
                Portfolio Chart
              </button>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFileUpload(!showFileUpload)}
          className="text-gray-600 hover:text-gray-900"
        >
          📎 Upload
        </Button>
      </div>

      {/* File Upload Section */}
      {showFileUpload && (
        <div className="p-3 bg-gray-50 border-b">
          <FileProcessor
            onDataExtracted={handleFileDataExtracted}
            isGuestMode={isGuestMode}
          />
        </div>
      )}

      {/* Guest Mode Indicator */}
      {isGuestMode && (
        <div className="p-3 border-b">
          <GuestModeIndicator 
            variant="compact"
          />
        </div>
      )}

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-scroll min-h-0"
        style={{ scrollbarGutter: 'stable' }}
        onScroll={handleScroll}
      >
        {/* Content wrapper with forced minimum height */}
        <div className="min-h-[calc(100vh-300px)] p-4 space-y-4">
          {/* Top spacer to ensure scrollable content when history available */}
          {hasMoreMessages && !isLoadingMore && (
            <div className="h-96 w-full" />
          )}

        {/* Load More Indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600">Loading conversation history...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* End of History Indicator */}
        {!hasMoreMessages && messages.length > 5 && (
          <div className="flex justify-center py-2">
            <div className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
              Beginning of conversation
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            <MessageBubble message={message} />
            {message.chartData && !hideInlineCharts && (
              <div className="mt-3">
                <ChartDisplay data={message.chartData} />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100 p-3">
        {uploadedData && (
          <div className="mb-2 bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-xs text-blue-700">
              📄 {uploadedData.type === 'portfolio' ? `${uploadedData.count} holdings loaded` : 'File data loaded'}
            </p>
          </div>
        )}
        
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Input
              value={inputValue}
              onChange={(e) => {
                // Only update if not currently navigating
                if (!isNavigating()) {
                  setInputValue(e.target.value);
                }
              }}
              onKeyDown={handleKeyPress}
              placeholder={uploadedData ? "Ask about your data..." : "Ask me anything..."}
              className="flex-1"
              disabled={isLoading}
            />
            {/* History navigation indicator */}
            {getNavigationState().isNavigating && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                ↑↓ {getNavigationState().currentIndex + 1}/{getNavigationState().historyLength}
              </div>
            )}
          </div>
          <Button 
            onClick={handleSend} 
            disabled={!inputValue.trim() || isLoading}
            size="sm"
            className="px-4"
          >
            Send
          </Button>
        </div>
        
        {/* Keyboard shortcuts hint */}
        <div className="text-xs text-gray-400 mt-2 text-center">
          Press ↑↓ to navigate history • Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export const ChatInterface = React.memo(ChatInterfaceComponent);


// // ============================================================================
// // FILE: components/chat/chat-interface.tsx (UPDATED)
// // Updated chat interface with file upload integration
// // ============================================================================

// 'use client';

// import React, { useState, useRef, useEffect } from 'react';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { MessageBubble } from './message-bubble';
// import { ChartDisplay } from './chart-display';
// import { FileProcessor } from './file-processor';
// import { simulateAIResponse } from '@/lib/chat-simulation';

// export interface Message {
//   id: string;
//   role: 'user' | 'assistant';
//   content: string;
//   timestamp: Date;
//   chartData?: any;
//   fileData?: any;
// }

// interface ChatInterfaceProps {
//   isGuestMode?: boolean;
// }

// export const ChatInterface: React.FC<ChatInterfaceProps> = ({ isGuestMode = false }) => {
//   const [messages, setMessages] = useState<Message[]>([
//     {
//       id: '1',
//       role: 'assistant',
//       content: isGuestMode 
//         ? 'Hi! I\'m your AI financial assistant. In demo mode, I can help you with general financial questions, market trends, and basic investment concepts. You can also upload portfolio files for analysis. Try asking me about stocks, bonds, or financial planning!'
//         : 'Hi! I\'m your AI financial assistant. I can help you with your portfolio, market analysis, and personalized financial insights. You can also upload your portfolio or preference files for detailed analysis. What would you like to know?',
//       timestamp: new Date(),
//     }
//   ]);
//   const [inputValue, setInputValue] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [showFileUpload, setShowFileUpload] = useState(false);
//   const [uploadedData, setUploadedData] = useState<any>(null);
//   const messagesEndRef = useRef<HTMLDivElement>(null);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   const handleSend = async () => {
//     if (!inputValue.trim() || isLoading) return;

//     const userMessage: Message = {
//       id: Date.now().toString(),
//       role: 'user',
//       content: inputValue,
//       timestamp: new Date(),
//     };

//     setMessages(prev => [...prev, userMessage]);
//     setInputValue('');
//     setIsLoading(true);

//     try {
//       // Include uploaded data context in the AI response
//       const response = await simulateAIResponse(inputValue, isGuestMode, uploadedData);
      
//       const assistantMessage: Message = {
//         id: (Date.now() + 1).toString(),
//         role: 'assistant',
//         content: response.content,
//         timestamp: new Date(),
//         chartData: response.chartData,
//       };

//       setMessages(prev => [...prev, assistantMessage]);
//     } catch (error) {
//       console.error('Chat error:', error);
//       const errorMessage: Message = {
//         id: (Date.now() + 1).toString(),
//         role: 'assistant',
//         content: 'Sorry, I encountered an error. Please try again.',
//         timestamp: new Date(),
//       };
//       setMessages(prev => [...prev, errorMessage]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleFileDataExtracted = (data: any, summary: string) => {
//     setUploadedData(data);
    
//     // Add a message about the uploaded data
//     const fileMessage: Message = {
//       id: Date.now().toString(),
//       role: 'assistant',
//       content: `Great! I've processed your uploaded file. ${summary}\n\nI can now provide insights based on this data. Try asking me questions like:\n• "Analyze my portfolio allocation"\n• "What are my risk exposures?"\n• "How can I improve my portfolio?"`,
//       timestamp: new Date(),
//       fileData: data
//     };
    
//     setMessages(prev => [...prev, fileMessage]);
//     setShowFileUpload(false);
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   const handleSampleQuestion = (question: string) => {
//     setInputValue(question);
//   };

//   return (
//     <div className="flex flex-col h-full max-h-[700px] bg-white rounded-lg shadow-lg">
//       {/* Chat Header */}
//       <div className="bg-blue-600 text-white p-4 rounded-t-lg">
//         <div className="flex justify-between items-center">
//           <div>
//             <h3 className="font-semibold">
//               {isGuestMode ? 'AI Assistant - Demo Mode' : 'AI Financial Assistant'}
//             </h3>
//             <p className="text-blue-100 text-sm">
//               {isGuestMode 
//                 ? 'Ask general financial questions & upload files'
//                 : 'Get personalized insights about your finances'
//               }
//             </p>
//           </div>
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={() => setShowFileUpload(!showFileUpload)}
//             className="bg-white text-blue-600 hover:bg-gray-100"
//           >
//             📎 Upload File
//           </Button>
//         </div>
//       </div>

//       {/* File Upload Section */}
//       {showFileUpload && (
//         <div className="p-4 bg-gray-50 border-b">
//           <FileProcessor
//             onDataExtracted={handleFileDataExtracted}
//             isGuestMode={isGuestMode}
//           />
//         </div>
//       )}

//       {/* Sample Questions */}
//       {messages.length === 1 && !showFileUpload && (
//         <div className="p-4 bg-gray-50 border-b">
//           <p className="text-sm text-gray-600 mb-3">Try asking:</p>
//           <div className="flex flex-wrap gap-3 sm:gap-2">
//             {isGuestMode ? (
//               <>
//                 <button
//                   onClick={() => handleSampleQuestion("What's the difference between stocks and bonds?")}
//                   className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
//                 >
//                   Stocks vs Bonds
//                 </button>
//                 <button
//                   onClick={() => handleSampleQuestion("How does compound interest work?")}
//                   className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
//                 >
//                   Compound Interest
//                 </button>
//                 <button
//                   onClick={() => handleSampleQuestion("Show me a sample portfolio allocation chart")}
//                   className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
//                 >
//                   Portfolio Chart
//                 </button>
//               </>
//             ) : (
//               <>
//                 <button
//                   onClick={() => handleSampleQuestion("Analyze my portfolio performance")}
//                   className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
//                 >
//                   Portfolio Analysis
//                 </button>
//                 <button
//                   onClick={() => handleSampleQuestion("What should I invest in next?")}
//                   className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
//                 >
//                   Investment Analysis
//                 </button>
//                 <button
//                   onClick={() => handleSampleQuestion("Show me market trends")}
//                   className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
//                 >
//                   Market Trends
//                 </button>
//               </>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Messages Area */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-4">
//         {messages.map((message) => (
//           <div key={message.id}>
//             <MessageBubble message={message} />
//             {message.chartData && (
//               <div className="mt-3">
//                 <ChartDisplay data={message.chartData} />
//               </div>
//             )}
//           </div>
//         ))}
//         {isLoading && (
//           <div className="flex justify-start">
//             <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
//               <div className="flex space-x-1">
//                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
//                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
//                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
//               </div>
//             </div>
//           </div>
//         )}
//         <div ref={messagesEndRef} />
//       </div>

//       {/* Input Area */}
//       <div className="border-t p-4">
//         {uploadedData && (
//           <div className="mb-3 bg-blue-50 border border-blue-200 rounded p-2">
//             <p className="text-sm text-blue-700">
//               📄 File data loaded: {uploadedData.type === 'portfolio' ? `${uploadedData.count} holdings` : 'Preferences & settings'}
//             </p>
//           </div>
//         )}
//         <div className="flex space-x-3 sm:space-x-2">
//           <Input
//             value={inputValue}
//             onChange={(e) => setInputValue(e.target.value)}
//             onKeyPress={handleKeyPress}
//             placeholder={uploadedData ? "Ask about your uploaded data..." : isGuestMode ? "Ask about finance basics..." : "Ask about your portfolio..."}
//             className="flex-1"
//             disabled={isLoading}
//           />
//           <Button 
//             onClick={handleSend} 
//             disabled={!inputValue.trim() || isLoading}
//             className="px-6"
//           >
//             Send
//           </Button>
//         </div>
//         {isGuestMode && (
//           <p className="text-xs text-gray-500 mt-2">
//             Demo mode: File analysis available, but data isn't saved. <a href="/register" className="text-blue-600 hover:underline">Sign up for persistent storage</a>
//           </p>
//         )}
//       </div>
//     </div>
//   );
// };

