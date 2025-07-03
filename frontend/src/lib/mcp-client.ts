// ============================================================================
// FILE: lib/mcp-client.ts
// MCP Client for integrating with Python financial tools
// ============================================================================

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface PortfolioRiskAnalysis {
  user_id: string;
  analysis_date: string;
  results: {
    [portfolio_id: string]: {
      portfolio_name: string;
      total_value: number;
      annual_return: number;
      annual_volatility: number;
      sharpe_ratio: number;
      var_95_daily: number;
      var_95_annual: number;
      max_drawdown: number;
      num_assets: number;
      risk_free_rate: number;
    } | { error: string };
  };
}

export interface SharpeRatioAnalysis {
  user_id: string;
  analysis_date: string;
  sharpe_analysis: {
    [portfolio_id: string]: {
      portfolio_name: string;
      sharpe_ratio: number;
      annual_return: number;
      annual_volatility: number;
      risk_free_rate: number;
    } | { error: string };
  };
}

export interface MarketDataSummary {
  user_id: string;
  period: string;
  symbols_analyzed: number;
  market_data: {
    [symbol: string]: {
      current_price: number;
      period_return: number;
      volatility: number;
      data_points: number;
    };
  };
  analysis_date: string;
}

class FinanceMCPClient {
  private serverPath: string;
  private pythonCmd: string;

  constructor() {
    this.serverPath = path.join(process.cwd(), 'mcp-server', 'finance_mcp_server.py');
    // Use uv run to execute with the correct virtual environment
    this.pythonCmd = process.env.PYTHON_CMD || 'uv run python';
  }

  /**
   * Execute MCP tool via Python subprocess with timeout and enhanced error handling
   */
  private async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const timeoutMs = 30000; // 30 second timeout
    
    try {
      // Convert args to command line arguments
      const argString = Object.entries(args)
        .map(([key, value]) => `--${key}="${value}"`)
        .join(' ');

      // Execute MCP tool using uv run in the correct directory
      const mcpServerDir = path.join(process.cwd(), 'mcp-server');
      const databaseUrl = process.env.DATABASE_URL || '';
      const command = `cd "${mcpServerDir}" && DATABASE_URL="${databaseUrl}" timeout ${timeoutMs / 1000} ${this.pythonCmd} -c "
import sys
import json
import os
os.chdir('${mcpServerDir}')
from finance_mcp_server import PortfolioAnalyzer, calculate_portfolio_risk, calculate_sharpe_ratio, get_portfolio_market_data

# Parse arguments
import argparse
parser = argparse.ArgumentParser()
parser.add_argument('--user_id', required=True)
parser.add_argument('--portfolio_id', required=False)
parser.add_argument('--period', default='1mo')
args = parser.parse_args()

# Execute tool
if '${toolName}' == 'calculate_portfolio_risk':
    result = calculate_portfolio_risk(args.user_id)
elif '${toolName}' == 'calculate_sharpe_ratio':
    result = calculate_sharpe_ratio(args.user_id, args.portfolio_id)
elif '${toolName}' == 'get_portfolio_market_data':
    result = get_portfolio_market_data(args.user_id, args.period)
else:
    result = {'error': 'Unknown tool'}

print(json.dumps(result, default=str))
" ${argString}`;

      const { stdout, stderr } = await execAsync(command, { timeout: timeoutMs });

      // Enhanced error handling
      if (stderr) {
        const isOnlyLogging = stderr.split('\n').every(line => 
          line.trim() === '' || 
          line.includes('INFO:') || 
          line.includes('DEBUG:') ||
          line.includes('WARNING:')
        );
        
        if (!isOnlyLogging) {
          console.error('MCP Tool Error:', stderr);
          
          // Check for specific error types for better fallback messages
          if (stderr.includes('ModuleNotFoundError') || stderr.includes('ImportError')) {
            return { error: 'Python dependencies not available' };
          } else if (stderr.includes('Connection refused') || stderr.includes('database')) {
            return { error: 'Database connection failed' };
          } else if (stderr.includes('timeout') || stderr.includes('killed')) {
            return { error: 'Analysis timed out' };
          }
          
          return { error: `Tool execution error: ${stderr}` };
        } else {
          // Just log the info messages but don't treat as error
          console.log('MCP Tool Logs:', stderr);
        }
      }

      // Validate stdout
      if (!stdout || stdout.trim() === '') {
        return { error: 'No data returned from analysis tool' };
      }

      try {
        const result = JSON.parse(stdout);
        
        // Validate the result structure
        if (typeof result === 'object' && result !== null) {
          return result;
        } else {
          return { error: 'Invalid response format from analysis tool' };
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Raw output:', stdout);
        return { error: 'Failed to parse analysis results' };
      }

    } catch (error) {
      console.error('MCP Client Error:', error);
      
      // Enhanced error handling based on error type
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          return { error: 'Analysis request timed out. Please try again.' };
        } else if (error.message.includes('ENOENT')) {
          return { error: 'Python environment not found. Please check installation.' };
        } else if (error.message.includes('Command failed')) {
          return { error: 'Analysis tool execution failed' };
        }
      }
      
      return { error: `Failed to execute tool: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Calculate comprehensive portfolio risk metrics
   */
  async calculatePortfolioRisk(userId: string, portfolioId?: string): Promise<PortfolioRiskAnalysis> {
    const args: Record<string, unknown> = { user_id: userId };
    if (portfolioId) {
      args.portfolio_id = portfolioId;
    }
    return await this.executeTool('calculate_portfolio_risk', args) as PortfolioRiskAnalysis;
  }

  /**
   * Calculate Sharpe ratio for user's portfolios
   */
  async calculateSharpeRatio(userId: string, portfolioId?: string): Promise<SharpeRatioAnalysis> {
    const args: Record<string, unknown> = { user_id: userId };
    if (portfolioId) {
      args.portfolio_id = portfolioId;
    }
    return await this.executeTool('calculate_sharpe_ratio', args) as SharpeRatioAnalysis;
  }

  /**
   * Get market data summary for portfolio symbols
   */
  async getPortfolioMarketData(userId: string, period: string = '1mo', portfolioId?: string): Promise<MarketDataSummary> {
    const args: Record<string, unknown> = { 
      user_id: userId, 
      period: period 
    };
    if (portfolioId) {
      args.portfolio_id = portfolioId;
    }
    return await this.executeTool('get_portfolio_market_data', args) as MarketDataSummary;
  }

  /**
   * Check if MCP server dependencies are available
   */
  async checkDependencies(): Promise<{ available: boolean; error?: string }> {
    try {
      const command = `${this.pythonCmd} -c "
import pandas
import numpy
import yfinance
import sqlalchemy
print('Dependencies OK')
"`;

      await execAsync(command);
      return { available: true };
    } catch (error) {
      return { 
        available: false, 
        error: `MCP dependencies not available: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

// Export singleton instance
export const financeMCPClient = new FinanceMCPClient();

// Utility functions for formatting results
export const formatRiskAnalysis = (analysis: PortfolioRiskAnalysis): string => {
  if (!analysis.results) return 'No portfolio data available';

  let formatted = `📊 **Portfolio Risk Analysis** (${new Date(analysis.analysis_date).toLocaleDateString()})\n\n`;

  Object.entries(analysis.results).forEach(([portfolioId, result]) => {
    if ('error' in result) {
      formatted += `❌ **${portfolioId}**: ${result.error}\n\n`;
    } else {
      formatted += `💼 **${result.portfolio_name}**\n`;
      formatted += `• Total Value: $${result.total_value.toLocaleString()}\n`;
      formatted += `• Annual Return: ${result.annual_return}%\n`;
      formatted += `• Volatility: ${result.annual_volatility}%\n`;
      formatted += `• Sharpe Ratio: ${result.sharpe_ratio}\n`;
      formatted += `• VaR (95%): ${result.var_95_daily}% daily, ${result.var_95_annual}% annual\n`;
      formatted += `• Max Drawdown: ${result.max_drawdown}%\n`;
      formatted += `• Assets: ${result.num_assets}\n\n`;
    }
  });

  return formatted;
};

export const formatSharpeAnalysis = (analysis: SharpeRatioAnalysis): string => {
  if (!analysis.sharpe_analysis) return 'No Sharpe ratio data available';

  let formatted = `📈 **Sharpe Ratio Analysis** (${new Date(analysis.analysis_date).toLocaleDateString()})\n\n`;

  Object.entries(analysis.sharpe_analysis).forEach(([portfolioId, result]) => {
    if ('error' in result) {
      formatted += `❌ **${portfolioId}**: ${result.error}\n\n`;
    } else {
      const rating = result.sharpe_ratio > 1 ? '🟢 Excellent' : 
                    result.sharpe_ratio > 0.5 ? '🟡 Good' : 
                    result.sharpe_ratio > 0 ? '🟠 Fair' : '🔴 Poor';
      
      formatted += `💼 **${result.portfolio_name}**\n`;
      formatted += `• Sharpe Ratio: ${result.sharpe_ratio} (${rating})\n`;
      formatted += `• Annual Return: ${result.annual_return}%\n`;
      formatted += `• Volatility: ${result.annual_volatility}%\n`;
      formatted += `• Risk-Free Rate: ${result.risk_free_rate}%\n\n`;
    }
  });

  formatted += `💡 **Sharpe Ratio Guide:**\n`;
  formatted += `• > 1.0: Excellent risk-adjusted returns\n`;
  formatted += `• 0.5-1.0: Good performance\n`;
  formatted += `• 0-0.5: Fair performance\n`;
  formatted += `• < 0: Poor performance (losing money vs risk-free rate)\n`;

  return formatted;
};