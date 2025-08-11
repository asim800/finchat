# Python Development Guide

## Package Management with uv

This project uses **uv** consistently for all Python package management across both the MCP server and FastAPI microservice.

### Why uv?

- **Faster**: 10-100x faster than pip/pipenv
- **Reliable**: Deterministic lock files
- **Modern**: Built-in pyproject.toml support
- **Consistent**: Same tool for all Python services

## Setup

### Install uv

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc

# Verify installation
uv --version
```

### Project Structure

Both Python services use the same uv-based structure:

```
├── pyproject.toml       # Primary dependency definition
├── uv.lock             # Lock file (auto-generated)
├── requirements.txt    # Vercel compatibility (auto-synced)
├── .venv/              # Virtual environment (auto-created)
└── start.sh           # Startup script using uv
```

## Development Workflow

### MCP Server

```bash
cd mcp-server

# Setup (first time)
uv sync                 # Creates .venv and installs dependencies

# Start the server
./start.sh              # Uses uv run
# or manually:
uv run finance-mcp
```

### FastAPI Service

```bash
cd fastapi-service      # or fastapi-portfolio-service

# Setup (first time)  
uv sync                 # Creates .venv and installs dependencies

# Start the server
./start.sh              # Uses uv run
# or manually:
uv run uvicorn main:app --reload
```

## Dependency Management

### Adding Dependencies

```bash
# Add production dependency
uv add fastapi>=0.104.1

# Add development dependency
uv add --dev pytest>=7.0.0

# Add optional dependency
uv add --optional dev pytest>=7.0.0
```

### Updating Dependencies

```bash
# Update all dependencies
uv sync --upgrade

# Update specific package
uv add fastapi@latest
```

### Removing Dependencies

```bash
# Remove dependency
uv remove package-name
```

## Configuration Files

### pyproject.toml Structure

```toml
[project]
name = "service-name"
version = "1.0.0"
description = "Service description"
requires-python = ">=3.9"
dependencies = [
    "fastapi>=0.104.1",
    # ... other deps
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "black>=23.0.0",
]

[tool.uv]
package = false  # This is an application, not a library

[tool.black]
line-length = 88

[tool.ruff]
line-length = 88
select = ["E", "F", "I", "N", "UP"]
```

### Lock Files

- **uv.lock**: Primary lock file (commit to git)
- **requirements.txt**: Generated for Vercel compatibility (commit to git)

## Service-Specific Notes

### MCP Server

- **Entry Points**: Defined in pyproject.toml as `project.scripts`
- **Available Commands**: 
  - `uv run finance-mcp`: Finance-specific MCP server
  - `uv run generic-mcp`: Generic MCP server

### FastAPI Service

- **Main Application**: `main.py` contains the FastAPI app
- **Vercel Deployment**: Uses `requirements.txt` (auto-synced from pyproject.toml)
- **Development Server**: `uvicorn main:app --reload`

## Environment Variables

Both services load environment variables from the parent `.env` file:

```bash
# Required for database connections
DATABASE_URL=postgresql://user:password@host:port/database

# FastAPI specific
FASTAPI_SERVICE_URL=https://your-service-url.vercel.app
PRIMARY_ANALYSIS_BACKEND=fastapi
ENABLE_BACKEND_FALLBACK=false
```

## Troubleshooting

### Common Issues

1. **uv not found**
   ```bash
   # Reinstall uv
   curl -LsSf https://astral.sh/uv/install.sh | sh
   source ~/.bashrc
   ```

2. **Dependencies out of sync**
   ```bash
   # Recreate virtual environment
   rm -rf .venv
   uv sync
   ```

3. **Import errors**
   ```bash
   # Ensure you're using uv run
   uv run python script.py
   # or activate environment
   source .venv/bin/activate
   python script.py
   ```

4. **Lock file conflicts**
   ```bash
   # Regenerate lock file
   uv lock --upgrade
   ```

### Development Commands

```bash
# Check dependency tree
uv tree

# Show package info
uv show package-name

# List installed packages
uv pip list

# Check for vulnerabilities
uv audit

# Format code (if black is installed)
uv run black .

# Run linter (if ruff is installed)
uv run ruff check .

# Run tests (if pytest is installed)
uv run pytest
```

## Integration with Next.js

The Next.js application integrates with Python services via:

1. **MCP Protocol**: For local development and fallback
2. **HTTP REST API**: For FastAPI microservice
3. **Environment Configuration**: Via `.env.local` and backend config

No Python dependencies are required in the Next.js project itself.

## Production Deployment

### Vercel

- **Requirements**: `requirements.txt` is used by Vercel (auto-synced)
- **Environment**: Set `DATABASE_URL` in Vercel dashboard
- **Build**: Vercel automatically installs from requirements.txt

### Docker (Future)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --no-dev
COPY . .
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0"]
```

## Best Practices

1. **Always use uv run**: Ensures correct environment
2. **Commit lock files**: uv.lock and requirements.txt
3. **Pin Python version**: Set `requires-python` in pyproject.toml  
4. **Use dev dependencies**: Separate dev tools from production deps
5. **Regular updates**: Run `uv sync --upgrade` periodically
6. **Environment isolation**: Each service has its own .venv

This ensures consistent, fast, and reliable Python development across all services! 🐍⚡