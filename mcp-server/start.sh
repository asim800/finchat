#!/bin/bash

# Finance MCP Server Startup Script

echo "🚀 Starting Finance MCP Server..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ uv is not installed. Please install it first:"
    echo "   curl -LsSf https://astral.sh/uv/install.sh | sh"
    echo "   source ~/.bashrc"
    exit 1
fi

# Initialize uv project if .venv doesn't exist
if [ ! -d ".venv" ]; then
    echo "🔧 Initializing uv virtual environment..."
    uv venv
fi

# Install/sync dependencies using uv
echo "📚 Installing dependencies with uv..."
uv sync

# Load environment variables
if [ -f "../.env" ]; then
    echo "🔐 Loading environment variables..."
    export $(cat ../.env | grep -v ^# | xargs)
fi

# Start the MCP server using uv run
echo "🌟 Starting Finance MCP Server..."
echo "Available entry points:"
echo "  - finance-mcp: Finance-specific MCP server"  
echo "  - generic-mcp: Generic MCP server"
echo ""
echo "Starting finance-mcp server..."
uv run finance-mcp