// ============================================================================
// FILE: components/chat/message-bubble.tsx (UPDATED)
// Updated message bubble with provider badges
// ============================================================================

import React from 'react';
import { getProviderConfig } from '@/lib/llm-config';

interface ChartData {
  type: 'pie' | 'bar';
  title: string;
  data: Array<{ name: string; value: number }>;
}

interface FileData {
  type: 'portfolio' | 'preferences' | 'text' | 'generic';
  [key: string]: unknown;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string; // 'openai', 'anthropic', or 'simulation'
  chartData?: ChartData;
  fileData?: FileData;
}

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  const getProviderBadge = (provider?: string) => {
    if (!provider || isUser) return null;
    
    switch (provider) {
      case 'openai':
        return (
          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
            🤖 {getProviderConfig('openai').displayName}
          </span>
        );
      case 'anthropic':
        return (
          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
            🧠 {getProviderConfig('anthropic').displayName}
          </span>
        );
      case 'simulation':
        return (
          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
            🎭 Demo Mode
          </span>
        );
      default:
        return (
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            🤖 AI Assistant
          </span>
        );
    }
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isUser 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-900'
      }`}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {/* Provider badge and timestamp for AI messages */}
        {!isUser && (
          <div className="mt-2 flex items-center justify-between">
            {getProviderBadge(message.provider)}
            <p className="text-xs text-gray-500 ml-2">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
        
        {/* Timestamp for user messages */}
        {isUser && (
          <p className="text-xs mt-1 text-blue-100">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
};




// // ============================================================================
// // FILE: components/chat/message-bubble.tsx
// // Individual message component
// // ============================================================================

// import React from 'react';
// import type { Message } from './chat-interface';

// interface MessageBubbleProps {
//   message: Message;
// }

// // In components/chat/message-bubble.tsx
// export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
//   const isUser = message.role === 'user';
  
//   return (
//     <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
//       <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
//         isUser 
//           ? 'bg-blue-600 text-white' 
//           : 'bg-gray-100 text-gray-900'
//       }`}>
//         <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
//         {/* Add provider badge for AI messages */}
//         {!isUser && message.provider && (
//           <div className="mt-2 flex items-center justify-between">
//             <span className={`text-xs px-2 py-1 rounded-full ${
//               message.provider === 'openai' 
//                 ? 'bg-green-100 text-green-700' 
//                 : 'bg-purple-100 text-purple-700'
//             }`}>
//               {message.provider === 'openai' ? '🤖 GPT-3.5' : '🧠 Claude'}
//             </span>
//             <p className="text-xs text-gray-500">
//               {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//             </p>
//           </div>
//         )}
        
//         {/* Original timestamp for user messages */}
//         {isUser && (
//           <p className="text-xs mt-1 text-blue-100">
//             {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//           </p>
//         )}
//       </div>
//     </div>
//   );
// };
