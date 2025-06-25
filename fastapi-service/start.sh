#!/bin/bash

# FastAPI Portfolio Analysis Service Startup Script

echo "🚀 Starting FastAPI Portfolio Analysis Service..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ uv is not installed. Please install it first:"
    echo "   curl -LsSf https://astral.sh/uv/install.sh | sh"
    echo "   source ~/.bashrc"
    exit 1
fi

# Check if pyproject.toml exists, if not create it
if [ ! -f "pyproject.toml" ]; then
    echo "📦 Creating pyproject.toml for uv..."
    cat > pyproject.toml << EOF
[project]
name = "fastapi-portfolio-service"
version = "1.0.0"
description = "FastAPI Portfolio Analysis Microservice"
dependencies = [
    "fastapi>=0.104.1",
    "uvicorn[standard]>=0.24.0",
    "pandas>=2.1.0",
    "numpy>=1.24.0",
    "yfinance>=0.2.24",
    "sqlalchemy>=2.0.0",
    "psycopg2-binary>=2.9.0",
    "python-dotenv>=1.0.0",
    "pydantic>=2.5.0",
    "python-multipart>=0.0.6"
]

[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"
EOF
fi

# Initialize uv project if .venv doesn't exist
if [ ! -d ".venv" ]; then
    echo "🔧 Initializing uv project and virtual environment..."
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

# Start the FastAPI server using uv run
echo "🌟 Starting FastAPI server on port 8000..."
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level info