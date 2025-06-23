# Adding New Analyzers to Generic MCP Server

This guide shows how to add new analysis capabilities to your MCP server in a pluggable, modular way.

## 🏗️ Architecture Overview

```
Generic MCP Server
├── analyzers/
│   ├── finance_analyzer.py     # Portfolio & risk analysis
│   ├── example_analyzer.py     # Template for new analyzers
│   ├── ml_analyzer.py          # Future: ML predictions
│   ├── sentiment_analyzer.py   # Future: News sentiment
│   └── ...                     # Any future analyzers
├── generic_mcp_server.py       # Core server framework
└── requirements-generic.txt    # Extensible dependencies
```

## 🔧 Creating a New Analyzer

### Step 1: Create Analyzer File

Create a new file in `analyzers/` directory:

```python
# analyzers/my_new_analyzer.py
import sys
import os
from typing import Dict, Any

# Import the framework
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from generic_mcp_server import BaseAnalyzer, mcp_analyzer, mcp_tool, mcp_resource

@mcp_analyzer
class MyNewAnalyzer(BaseAnalyzer):
    """Description of what this analyzer does"""
    
    def __init__(self, database_engine=None):
        super().__init__(database_engine)
        # Your initialization code
    
    @mcp_tool
    def tool_my_analysis(self, user_id: str, param: str) -> Dict[str, Any]:
        """
        Description of what this tool does
        
        Args:
            user_id: User identifier
            param: Analysis parameter
            
        Returns:
            Analysis results
        """
        # Your analysis logic here
        return {
            "user_id": user_id,
            "result": "analysis complete",
            "data": {"key": "value"}
        }
    
    @mcp_resource("mydata://{user_id}")
    def resource_user_data(self, user_id: str) -> str:
        """Get user's data for this analyzer"""
        # Your data retrieval logic
        return json.dumps({"user_id": user_id, "data": "..."})
```

### Step 2: Add Dependencies (if needed)

Add any new Python packages to `requirements-generic.txt`:

```txt
# Add your analyzer's dependencies
scikit-learn>=1.3.0  # For ML analyzer
requests>=2.28.0     # For API analyzer
beautifulsoup4>=4.11.0  # For web scraping
```

### Step 3: Test Your Analyzer

Your analyzer will be automatically loaded when the server starts! No configuration needed.

## 📊 Real-World Examples

### Example 1: ML Predictions Analyzer

```python
# analyzers/ml_analyzer.py
@mcp_analyzer
class MLAnalyzer(BaseAnalyzer):
    
    @mcp_tool
    def tool_predict_stock_movement(self, user_id: str, symbol: str) -> Dict[str, Any]:
        """Predict stock price movement using ML models"""
        # Load your trained model
        # Get historical data
        # Make prediction
        return {
            "symbol": symbol,
            "prediction": "up",
            "confidence": 0.75,
            "reasoning": "Technical indicators suggest upward trend"
        }
```

### Example 2: News Sentiment Analyzer

```python
# analyzers/sentiment_analyzer.py
@mcp_analyzer  
class SentimentAnalyzer(BaseAnalyzer):
    
    @mcp_tool
    def tool_analyze_news_sentiment(self, user_id: str, symbols: List[str]) -> Dict[str, Any]:
        """Analyze news sentiment for given stocks"""
        # Fetch news for symbols
        # Run sentiment analysis
        # Return sentiment scores
        return {
            "symbols": symbols,
            "sentiment_scores": {"AAPL": 0.8, "GOOGL": 0.6},
            "summary": "Generally positive sentiment"
        }
```

### Example 3: Options Strategy Analyzer

```python
# analyzers/options_analyzer.py
@mcp_analyzer
class OptionsAnalyzer(BaseAnalyzer):
    
    @mcp_tool
    def tool_suggest_options_strategies(self, user_id: str, outlook: str) -> Dict[str, Any]:
        """Suggest options strategies based on market outlook"""
        # Analyze user's portfolio
        # Consider market outlook
        # Suggest appropriate strategies
        return {
            "outlook": outlook,
            "strategies": [
                {"name": "Covered Call", "reason": "Generate income"},
                {"name": "Cash Secured Put", "reason": "Acquire stock at discount"}
            ]
        }
```

## 🔌 Integration with Next.js

### Step 1: Update MCP Client

Add your new tool to `lib/mcp-client.ts`:

```typescript
async callMyNewTool(userId: string, param: string): Promise<MyAnalysisResult> {
  return await this.executeTool('mynewanalyzer_tool_my_analysis', { 
    user_id: userId, 
    param: param 
  }) as MyAnalysisResult;
}
```

### Step 2: Add Trigger Keywords

Update `app/api/chat/route.ts` to trigger your analyzer:

```typescript
// Keywords that trigger your analyzer
const myAnalyzerKeywords = [
  'my analysis', 'custom analysis', 'special calculation'
];

// In analyzeMCPToolNeeds function:
if (myAnalyzerKeywords.some(keyword => lowerMessage.includes(keyword))) {
  console.log('🔧 Executing my custom analysis tool...');
  const result = await financeMCPClient.callMyNewTool(userId, 'param');
  toolResults += formatMyAnalysisResult(result) + '\n\n';
}
```

### Step 3: Add Result Formatting

Create a formatter in `lib/mcp-client.ts`:

```typescript
export const formatMyAnalysisResult = (analysis: MyAnalysisResult): string => {
  return `🔬 **My Custom Analysis**\n• Result: ${analysis.result}\n• Details: ${analysis.data}`;
};
```

## 🚀 Advanced Features

### Database Integration

Your analyzer automatically gets database access:

```python
@mcp_tool
def tool_analyze_user_behavior(self, user_id: str) -> Dict[str, Any]:
    """Analyze user's trading behavior patterns"""
    
    if not self.db_engine:
        return {"error": "Database not available"}
    
    # Query user's transaction history
    query = """
    SELECT * FROM transactions 
    WHERE userId = :user_id 
    ORDER BY date DESC LIMIT 100
    """
    
    with self.db_engine.connect() as conn:
        result = conn.execute(text(query), {"user_id": user_id})
        transactions = result.fetchall()
    
    # Analyze patterns
    return {"behavior_score": 85, "patterns": ["frequent_trader"]}
```

### Configuration via Environment Variables

```python
def __init__(self, database_engine=None):
    super().__init__(database_engine)
    
    # Load analyzer-specific config
    self.api_key = os.getenv("MY_ANALYZER_API_KEY")
    self.model_path = os.getenv("MY_ANALYZER_MODEL_PATH", "default_model.pkl")
    self.threshold = float(os.getenv("MY_ANALYZER_THRESHOLD", "0.75"))
```

### Error Handling and Logging

```python
@mcp_tool
def tool_complex_analysis(self, user_id: str) -> Dict[str, Any]:
    """Complex analysis with proper error handling"""
    
    try:
        self.logger.info(f"Starting complex analysis for {user_id}")
        
        # Your analysis logic
        result = self._run_complex_calculation()
        
        self.logger.info(f"Analysis completed successfully for {user_id}")
        return result
        
    except Exception as e:
        self.logger.error(f"Analysis failed for {user_id}: {e}")
        return {"error": f"Analysis failed: {str(e)}"}
```

## 📝 Best Practices

1. **Follow Naming Conventions**
   - File: `my_analyzer.py`
   - Class: `MyAnalyzer`  
   - Tools: `tool_action_name`
   - Resources: `resource_data_name`

2. **Add Comprehensive Docstrings**
   - Describe what the tool does
   - Document all parameters
   - Specify return format

3. **Handle Errors Gracefully**
   - Return error objects instead of raising exceptions
   - Log errors for debugging
   - Provide helpful error messages

4. **Use Type Hints**
   - Specify parameter and return types
   - Makes integration easier
   - Improves code quality

5. **Test Independently**
   - Test your analyzer logic separately
   - Verify database connections
   - Check with sample data

## 🧪 Testing Your Analyzer

```python
# test_my_analyzer.py
def test_my_analyzer():
    analyzer = MyAnalyzer()
    result = analyzer.tool_my_analysis("test_user", "test_param")
    
    assert "user_id" in result
    assert result["user_id"] == "test_user"
    print("✅ Analyzer test passed!")

if __name__ == "__main__":
    test_my_analyzer()
```

## 🎯 Summary

With this generic architecture, adding new analysis capabilities is as simple as:

1. **Create analyzer file** in `analyzers/` directory
2. **Use decorators** to mark tools and resources  
3. **Server automatically loads** your analyzer
4. **Add keywords** to trigger from chat interface
5. **Your tools are available** to users immediately!

This makes your MCP server incredibly extensible for any future Python analysis needs! 🚀