// Welcome message shown when a chat session has no history.

export function getWelcomeMessageContent(isGuestMode: boolean): string {
  return isGuestMode
    ? 'Welcome to MyStocks.ai! 🌟\n\nChat with our AI assistant about general financial topics. Sign up for personalized analysis!\n\nTry asking about stocks, bonds, market trends, or upload a portfolio file for analysis.'
    : 'Welcome to MyStocks.ai! 🌟\n\nGet personalized financial insights and portfolio analysis from our AI assistant.\n\nAsk me about your portfolio, market analysis, investment strategies, or upload files for detailed analysis.';
}
