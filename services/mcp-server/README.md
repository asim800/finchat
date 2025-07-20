# MCP Server Directory

This directory is reserved for future Model Context Protocol (MCP) services that may be needed for local development and testing.

## Purpose

This placeholder directory maintains the infrastructure for MCP-based local services while the main application uses FastAPI for financial analysis.

## Structure

```
services/mcp-server/
├── README.md                 # This file
├── generic_mcp_server.py     # Generic MCP server template
├── analyzers/                # Directory for future MCP analyzers
│   └── example_analyzer.py   # Example analyzer template
├── pyproject.toml           # Python dependencies
├── requirements-generic.txt # Alternative requirements file
└── setup.py                # Setup script
```

## Future Use Cases

This directory can be used for:
- Development and testing of new MCP-based services
- Local debugging tools
- Experimental analysis features
- Non-financial MCP services

## Current Status

**Note: Financial analysis services now use FastAPI exclusively.** 

The main application has been migrated to use the FastAPI service located in `services/fastapi-portfolio-service/` for all financial analysis needs.

## Getting Started (For Future MCP Services)

1. Install dependencies:
   ```bash
   cd services/mcp-server
   pip install uv
   uv sync
   ```

2. Use the generic MCP server as a template:
   ```bash
   python generic_mcp_server.py
   ```

3. Add new analyzers to the `analyzers/` directory following the example pattern.

## Environment Variables

MCP services may require:
- `DATABASE_URL` - Database connection string
- Other service-specific variables as needed

For questions about MCP server development, refer to the [FastMCP documentation](https://github.com/jlowin/fastmcp).