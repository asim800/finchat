// ============================================================================
// FILE: lib/portfolio-parser.ts
// Portfolio parsing utilities for chat input
// ============================================================================

export interface ParsedAsset {
  symbol: string;
  quantity: number;
  avgPrice?: number | null;
  assetType?: string;
}

export interface PortfolioParseResult {
  success: boolean;
  assets: ParsedAsset[];
  totalAssets: number;
  errors: string[];
  message: string;
}

// Regex patterns for different portfolio input formats
const PORTFOLIO_PATTERNS = [
  // Format: "AAPL 100 shares" or "AAPL 100"
  /(?:add|buy|own|have)?\s*([A-Z]{1,5})\s+(\d+(?:\.\d+)?)\s*(?:shares?)?/gi,
  
  // Format: "100 shares of AAPL" or "100 AAPL"
  /(?:add|buy|own|have)?\s*(\d+(?:\.\d+)?)\s*(?:shares?\s+of\s+|shares?\s+)?([A-Z]{1,5})/gi,
  
  // Format: "AAPL: 100 shares at $150" or "AAPL: 100 @ $150"
  /([A-Z]{1,5}):\s*(\d+(?:\.\d+)?)\s*(?:shares?\s+)?(?:at|@)\s*\$?(\d+(?:\.\d+)?)/gi,
  
  // Format: "AAPL 100 $150" (symbol quantity price)
  /([A-Z]{1,5})\s+(\d+(?:\.\d+)?)\s+\$?(\d+(?:\.\d+)?)/gi
];

// Keywords that indicate portfolio operations
const PORTFOLIO_KEYWORDS = [
  'portfolio', 'holdings', 'assets', 'positions', 'stocks', 'shares', 'own', 'have',
  'add', 'buy', 'bought', 'purchase', 'invest', 'investment', 'position'
];

// Common stock symbols for validation
const COMMON_SYMBOLS = [
  'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NFLX', 'NVDA', 'AMD', 'INTC',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'V', 'MA', 'PYPL', 'SQ',
  'JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'CVS', 'WMT', 'TGT', 'COST', 'HD',
  'DIS', 'CMCSA', 'T', 'VZ', 'KO', 'PEP', 'MCD', 'SBUX', 'NKE', 'BA'
];

export function detectPortfolioIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Check for portfolio keywords
  const hasPortfolioKeywords = PORTFOLIO_KEYWORDS.some(keyword => 
    lowerMessage.includes(keyword)
  );
  
  // Check for stock symbols
  const hasStockSymbols = COMMON_SYMBOLS.some(symbol => 
    message.toUpperCase().includes(symbol)
  );
  
  // Check for quantity patterns
  const hasQuantityPattern = /\d+\s*(?:shares?|stocks?)/i.test(message);
  
  return hasPortfolioKeywords || hasStockSymbols || hasQuantityPattern;
}

export function parsePortfolioInput(message: string): PortfolioParseResult {
  const assets: ParsedAsset[] = [];
  const errors: string[] = [];
  
  // Clean the message
  const cleanMessage = message.replace(/[,;]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Try each pattern
  for (const pattern of PORTFOLIO_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex
    let match;
    
    while ((match = pattern.exec(cleanMessage)) !== null) {
      try {
        let symbol: string, quantity: number, avgPrice: number | undefined;
        
        // Determine which pattern matched and extract values
        if (pattern.source.includes('([A-Z]{1,5}).*?(\\d+')) {
          // Symbol first patterns
          symbol = match[1].toUpperCase();
          quantity = parseFloat(match[2]);
          avgPrice = match[3] ? parseFloat(match[3]) : undefined;
        } else {
          // Quantity first patterns  
          quantity = parseFloat(match[1]);
          symbol = match[2].toUpperCase();
          avgPrice = match[3] ? parseFloat(match[3]) : undefined;
        }
        
        // Validate symbol length
        if (symbol.length < 1 || symbol.length > 5) {
          errors.push(`Invalid symbol: ${symbol}`);
          continue;
        }
        
        // Validate quantity
        if (quantity <= 0 || !isFinite(quantity)) {
          errors.push(`Invalid quantity for ${symbol}: ${quantity}`);
          continue;
        }
        
        // Check for duplicates
        const existingAsset = assets.find(asset => asset.symbol === symbol);
        if (existingAsset) {
          existingAsset.quantity += quantity;
          if (avgPrice && existingAsset.avgPrice) {
            // Simple average for now
            existingAsset.avgPrice = (existingAsset.avgPrice + avgPrice) / 2;
          } else if (avgPrice) {
            existingAsset.avgPrice = avgPrice;
          }
        } else {
          assets.push({
            symbol,
            quantity,
            avgPrice,
            assetType: 'stock' // Default to stock
          });
        }
      } catch {
        errors.push(`Error parsing: ${match[0]}`);
      }
    }
  }
  
  // Generate result message
  let message_text = '';
  if (assets.length > 0) {
    message_text = `Found ${assets.length} asset${assets.length > 1 ? 's' : ''}:\n`;
    assets.forEach(asset => {
      const priceText = asset.avgPrice ? ` at $${asset.avgPrice.toFixed(2)}` : '';
      message_text += `• ${asset.symbol}: ${asset.quantity} shares${priceText}\n`;
    });
    
    if (errors.length > 0) {
      message_text += `\nSome entries had issues: ${errors.join(', ')}`;
    }
  } else {
    message_text = 'No valid assets found in your message. Try formats like:\n';
    message_text += '• "I own 100 AAPL and 50 GOOGL"\n';
    message_text += '• "Add MSFT: 25 shares at $300"\n';
    message_text += '• "My portfolio: TSLA 10, NVDA 5 shares"';
  }
  
  return {
    success: assets.length > 0,
    assets,
    totalAssets: assets.length,
    errors,
    message: message_text
  };
}

export function formatPortfolioResponse(parseResult: PortfolioParseResult, isGuestMode: boolean): string {
  if (!parseResult.success) {
    return parseResult.message;
  }
  
  const totalValue = parseResult.assets.reduce((sum, asset) => {
    return sum + (asset.avgPrice ? asset.quantity * asset.avgPrice : 0);
  }, 0);
  
  let response = `Great! I've added ${parseResult.totalAssets} asset${parseResult.totalAssets > 1 ? 's' : ''} to your portfolio:\n\n`;
  
  parseResult.assets.forEach(asset => {
    const value = asset.avgPrice ? asset.quantity * asset.avgPrice : 0;
    const priceText = asset.avgPrice ? ` ($${asset.avgPrice.toFixed(2)} each)` : '';
    const valueText = value > 0 ? ` = $${value.toLocaleString()}` : '';
    response += `📈 **${asset.symbol}**: ${asset.quantity} shares${priceText}${valueText}\n`;
  });
  
  if (totalValue > 0) {
    response += `\n💰 **Total Portfolio Value**: $${totalValue.toLocaleString()}\n`;
  }
  
  if (isGuestMode) {
    response += '\n*Note: This portfolio is stored temporarily. Sign up to save permanently and get detailed analysis!*';
  } else {
    response += '\n✅ Your portfolio has been saved. Ask me for analysis, risk assessment, or rebalancing suggestions!';
  }
  
  return response;
}