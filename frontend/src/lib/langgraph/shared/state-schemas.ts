// ============================================================================
// FILE: lib/langgraph/shared/state-schemas.ts
// Shared state schemas for LangGraph frontend and backend
// ============================================================================

import { z } from 'zod';

// Base conversation state schema
export const ConversationStateSchema = z.object({
  // Input/Output
  userInput: z.string().optional(),
  response: z.object({
    content: z.string(),
    provider: z.enum(['openai', 'anthropic', 'regexp', 'simulation']).optional(),
    chartData: z.object({
      type: z.enum(['pie', 'bar']),
      title: z.string(),
      data: z.array(z.object({
        name: z.string(),
        value: z.number()
      }))
    }).optional(),
    metadata: z.record(z.any()).optional()
  }).optional(),

  // Context
  portfolioContext: z.object({
    userId: z.string().optional(),
    guestSessionId: z.string().optional(),
    isGuestMode: z.boolean().default(false),
    portfolios: z.array(z.any()).optional(),
    userPreferences: z.record(z.any()).optional()
  }).optional(),

  // Processing metadata
  processingType: z.enum(['frontend', 'backend', 'hybrid']).optional(),
  routingDecision: z.object({
    routeTo: z.enum(['frontend', 'backend']),
    confidence: z.number(),
    reasoning: z.record(z.boolean()),
    complexityScore: z.number()
  }).optional(),

  // UI State
  uiState: z.object({
    isLoading: z.boolean().default(false),
    showCharts: z.boolean().default(false),
    activeProvider: z.string().optional(),
    sessionId: z.string().optional()
  }).optional(),

  // Backend processing state
  backendState: z.object({
    activeAgent: z.enum(['portfolio', 'market', 'risk', 'coordinator']).optional(),
    agentResults: z.record(z.any()).optional(),
    toolResults: z.array(z.object({
      toolName: z.string(),
      result: z.any(),
      success: z.boolean()
    })).optional(),
    llmProvider: z.enum(['openai', 'anthropic']).optional(),
    tokens: z.number().optional()
  }).optional(),

  // Error handling
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    recoverable: z.boolean().default(true)
  }).optional()
});

export type ConversationState = z.infer<typeof ConversationStateSchema>;

// Routing decision schema
export const RoutingDecisionSchema = z.object({
  routeTo: z.enum(['frontend', 'backend']),
  confidence: z.number().min(0).max(1),
  reasoning: z.object({
    hasPortfolioOperations: z.boolean(),
    requiresLLM: z.boolean(),
    needsExternalData: z.boolean(),
    requiresCalculation: z.boolean(),
    isMultiStep: z.boolean(),
    hasFileUpload: z.boolean(),
    isSimpleQuery: z.boolean()
  }),
  complexityScore: z.number().min(0).max(1)
});

export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;

// Portfolio operation schema
export const PortfolioOperationSchema = z.object({
  action: z.enum(['add', 'remove', 'update', 'show']),
  symbol: z.string(),
  quantity: z.number().optional(),
  price: z.number().optional(),
  avgCost: z.number().optional(),
  portfolioName: z.string().optional(),
  confidence: z.number().min(0).max(1)
});

export type PortfolioOperation = z.infer<typeof PortfolioOperationSchema>;

// Agent coordination schema
export const AgentCoordinationSchema = z.object({
  currentAgent: z.enum(['portfolio', 'market', 'risk', 'coordinator']),
  nextAgent: z.enum(['portfolio', 'market', 'risk', 'coordinator', 'complete']).optional(),
  handoffReason: z.string().optional(),
  sharedContext: z.record(z.any()).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
});

export type AgentCoordination = z.infer<typeof AgentCoordinationSchema>;

// Tool execution schema
export const ToolExecutionSchema = z.object({
  toolName: z.string(),
  parameters: z.record(z.any()),
  expectedOutput: z.string().optional(),
  timeout: z.number().default(30000), // 30 seconds
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3)
});

export type ToolExecution = z.infer<typeof ToolExecutionSchema>;

// Communication protocol schema for frontend-backend
export const CommunicationMessageSchema = z.object({
  type: z.enum(['request', 'response', 'stream', 'error']),
  requestId: z.string(),
  payload: z.any(),
  timestamp: z.number(),
  source: z.enum(['frontend', 'backend'])
});

export type CommunicationMessage = z.infer<typeof CommunicationMessageSchema>;

// Export all schemas for validation
export const LangGraphSchemas = {
  ConversationState: ConversationStateSchema,
  RoutingDecision: RoutingDecisionSchema,
  PortfolioOperation: PortfolioOperationSchema,
  AgentCoordination: AgentCoordinationSchema,
  ToolExecution: ToolExecutionSchema,
  CommunicationMessage: CommunicationMessageSchema
};

// Utility functions for state validation
export const validateState = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error('State validation error:', error);
    throw new Error(`Invalid state: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const createInitialState = (): ConversationState => ({
  portfolioContext: {
    isGuestMode: false,
    portfolios: [],
    userPreferences: {}
  },
  uiState: {
    isLoading: false,
    showCharts: false
  },
  backendState: {
    agentResults: {},
    toolResults: []
  }
});