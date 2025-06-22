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
import { LLMSelector } from './llm-selector';
import { useChatAPI } from '@/hooks/use-chat-api';
import { simulateAIResponse } from '@/lib/chat-simulation';
import { generateGuestSessionId } from '@/lib/guest-portfolio';

interface ChatInterfaceProps {
  isGuestMode?: boolean;
  userId?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ isGuestMode = false, userId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
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
  const [selectedProvider, setSelectedProvider] = useState<'anthropic' | 'openai'>('openai');
  const [availableProviders, setAvailableProviders] = useState<('anthropic' | 'openai')[]>(['openai']);
  const [guestSessionId] = useState<string>(() => generateGuestSessionId());
  
  const { sendMessage, loadLatestSession, isLoading, error } = useChatAPI();

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
      } else {
        // No existing session or empty session, show welcome message
        const welcomeMessage: Message = {
          id: '1',
          role: 'assistant',
          content: isGuestMode 
            ? 'Hi! I\'m your AI financial assistant. In demo mode, I can help you with general financial questions, market trends, and basic investment concepts. You can also upload portfolio files for analysis. Try asking me about stocks, bonds, or financial planning!'
            : 'Hi! I\'m your AI financial assistant. I can help you with your portfolio, market analysis, and personalized financial advice. You can also upload your portfolio or preference files for detailed analysis. What would you like to know?',
          timestamp: new Date(),
          provider: 'simulation'
        };
        
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Error initializing chat session:', error);
      
      // Fallback to welcome message
      const welcomeMessage: Message = {
        id: '1',
        role: 'assistant',
        content: isGuestMode 
          ? 'Hi! I\'m your AI financial assistant. In demo mode, I can help you with general financial questions, market trends, and basic investment concepts. You can also upload portfolio files for analysis. Try asking me about stocks, bonds, or financial planning!'
          : 'Hi! I\'m your AI financial assistant. I can help you with your portfolio, market analysis, and personalized financial advice. You can also upload your portfolio or preference files for detailed analysis. What would you like to know?',
        timestamp: new Date(),
        provider: 'simulation'
      };
      
      setMessages([welcomeMessage]);
    }
  }, [isGuestMode, guestSessionId, loadLatestSession]);

  // Initialize chat session - load existing history or show welcome message
  useEffect(() => {
    initializeSession();
  }, [initializeSession]); // Include memoized initializeSession
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check available providers on mount
  useEffect(() => {
    checkAvailableProviders();
  }, []);

  const checkAvailableProviders = async () => {
    try {
      const response = await fetch('/api/chat/providers');
      if (response.ok) {
        const data = await response.json();
        setAvailableProviders(data.providers || ['simulation']);
        if (data.providers && data.providers.length > 0) {
          setSelectedProvider(data.providers[0]);
        }
      }
    } catch {
      console.log('Could not fetch providers, using simulation mode');
      setAvailableProviders(['openai']); // Fallback
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');

    try {
      // Try API first
      const response = await sendMessage(currentInput, {
        provider: selectedProvider,
        portfolioData: uploadedData || undefined,
        sessionId: currentSessionId || undefined,
        guestSessionId: isGuestMode ? guestSessionId : undefined,
      });

      if (response) {
        console.log(`✅ Response from: ${response.provider}`); // Debug log
        setMessages(prev => [...prev, response]);
        
        // Update session ID if this is a new session
        if (response.sessionId && !currentSessionId) {
          setCurrentSessionId(response.sessionId);
        }
      } else {
        throw new Error('API response failed');
      }
      
    } catch (apiError) {
      console.log('API failed, falling back to simulation:', apiError);
      
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
    
    const fileMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Great! I've processed your uploaded file. ${summary}\n\nI can now provide insights based on this data. Try asking me questions like:\n• "Analyze my portfolio allocation"\n• "What are my risk exposures?"\n• "How can I improve my portfolio?"`,
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
    }
  };

  const handleSampleQuestion = (question: string) => {
    setInputValue(question);
  };

  return (
    <div className="flex flex-col h-full max-h-[700px] bg-white rounded-lg shadow-lg">
      {/* Chat Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">
              {isGuestMode ? 'AI Assistant - Demo Mode' : 'AI Financial Assistant'}
            </h3>
            <p className="text-blue-100 text-sm">
              {isGuestMode 
                ? 'Ask general financial questions & upload files'
                : 'Get personalized insights about your finances'
              }
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <LLMSelector
              selectedProvider={selectedProvider}
              onProviderChange={setSelectedProvider}
              availableProviders={availableProviders}
              className="text-white"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              📎 Upload File
            </Button>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      {showFileUpload && (
        <div className="p-4 bg-gray-50 border-b">
          <FileProcessor
            onDataExtracted={handleFileDataExtracted}
            isGuestMode={isGuestMode}
          />
        </div>
      )}

      {/* Sample Questions */}
      {messages.length === 1 && !showFileUpload && (
        <div className="p-4 bg-gray-50 border-b">
          <p className="text-sm text-gray-600 mb-3">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {isGuestMode ? (
              <>
                <button
                  onClick={() => handleSampleQuestion("What's the difference between stocks and bonds?")}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  Stocks vs Bonds
                </button>
                <button
                  onClick={() => handleSampleQuestion("How does compound interest work?")}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  Compound Interest
                </button>
                <button
                  onClick={() => handleSampleQuestion("Show me a sample portfolio allocation chart")}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  Portfolio Chart
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSampleQuestion("Analyze my portfolio performance")}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  Portfolio Analysis
                </button>
                <button
                  onClick={() => handleSampleQuestion("What should I invest in next?")}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  Investment Advice
                </button>
                <button
                  onClick={() => handleSampleQuestion("Show me market trends")}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  Market Trends
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            <MessageBubble message={message} />
            {message.chartData && (
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

      {/* Input Area */}
      <div className="border-t p-4">
        {uploadedData && (
          <div className="mb-3 bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-sm text-blue-700">
              📄 File data loaded: {uploadedData.type === 'portfolio' ? `${uploadedData.count} holdings` : 'Preferences & settings'}
            </p>
          </div>
        )}
        
        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded p-2">
            <p className="text-sm text-red-700">⚠️ Using demo mode: {error}</p>
          </div>
        )}
        
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={uploadedData ? "Ask about your uploaded data..." : isGuestMode ? "Ask about finance basics..." : "Ask about your portfolio..."}
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend} 
            disabled={!inputValue.trim() || isLoading}
            className="px-6"
          >
            Send
          </Button>
        </div>
        {isGuestMode && (
          <p className="text-xs text-gray-500 mt-2">
            Demo mode: File analysis available, but data isn&apos;t saved. <a href="/register" className="text-blue-600 hover:underline">Sign up for persistent storage</a>
          </p>
        )}
      </div>
    </div>
  );
};


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
//         : 'Hi! I\'m your AI financial assistant. I can help you with your portfolio, market analysis, and personalized financial advice. You can also upload your portfolio or preference files for detailed analysis. What would you like to know?',
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
//           <div className="flex flex-wrap gap-2">
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
//                   Investment Advice
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
//         <div className="flex space-x-2">
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

