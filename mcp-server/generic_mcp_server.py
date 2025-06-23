#!/usr/bin/env python3
"""
Generic MCP Server Framework
Extensible architecture for adding any type of analysis tools
"""

import os
import json
import importlib
import logging
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from pathlib import Path

# Third-party imports
from sqlalchemy import create_engine
from dotenv import load_dotenv

# MCP imports
from mcp.server.fastmcp import FastMCP
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GenericMCPServer:
    """Generic MCP Server that can load and register any type of tools"""
    
    def __init__(self, server_name: str = "GenericTools"):
        self.mcp = FastMCP(server_name)
        self.tools = {}
        self.resources = {}
        self.analyzers = {}
        
        # Database connection (optional)
        self.database_url = os.getenv("DATABASE_URL")
        self.engine = None
        if self.database_url:
            self.engine = create_engine(self.database_url)
            logger.info("Database connection initialized")
    
    def register_analyzer(self, name: str, analyzer_class):
        """Register an analyzer class that provides tools and resources"""
        try:
            # Initialize analyzer with database if available
            if self.engine:
                analyzer = analyzer_class(database_engine=self.engine)
            else:
                analyzer = analyzer_class()
                
            self.analyzers[name] = analyzer
            
            # Auto-register tools from analyzer
            self._register_analyzer_tools(name, analyzer)
            self._register_analyzer_resources(name, analyzer)
            
            logger.info(f"Registered analyzer: {name}")
            
        except Exception as e:
            logger.error(f"Failed to register analyzer {name}: {e}")
    
    def _register_analyzer_tools(self, analyzer_name: str, analyzer):
        """Register all tools from an analyzer"""
        # Look for methods decorated with @tool or starting with 'tool_'
        for attr_name in dir(analyzer):
            if attr_name.startswith('tool_') or hasattr(getattr(analyzer, attr_name), '_is_mcp_tool'):
                method = getattr(analyzer, attr_name)
                
                # Create MCP tool wrapper
                @self.mcp.tool()
                def tool_wrapper(*args, **kwargs):
                    return method(*args, **kwargs)
                
                # Copy metadata
                tool_wrapper.__name__ = f"{analyzer_name}_{attr_name}"
                tool_wrapper.__doc__ = method.__doc__
                
                self.tools[f"{analyzer_name}_{attr_name}"] = tool_wrapper
    
    def _register_analyzer_resources(self, analyzer_name: str, analyzer):
        """Register all resources from an analyzer"""
        # Look for methods decorated with @resource or starting with 'resource_'
        for attr_name in dir(analyzer):
            if attr_name.startswith('resource_') or hasattr(getattr(analyzer, attr_name), '_is_mcp_resource'):
                method = getattr(analyzer, attr_name)
                
                # Extract resource path pattern from method
                if hasattr(method, '_resource_pattern'):
                    pattern = method._resource_pattern
                else:
                    pattern = f"{analyzer_name}://{{{attr_name.replace('resource_', '')}}}"
                
                # Create MCP resource wrapper
                @self.mcp.resource(pattern)
                def resource_wrapper(*args, **kwargs):
                    return method(*args, **kwargs)
                
                self.resources[f"{analyzer_name}_{attr_name}"] = resource_wrapper
    
    def load_analyzers_from_directory(self, directory: str = "analyzers"):
        """Automatically load all analyzer modules from directory"""
        analyzers_path = Path(__file__).parent / directory
        
        if not analyzers_path.exists():
            logger.warning(f"Analyzers directory not found: {analyzers_path}")
            return
        
        for file_path in analyzers_path.glob("*.py"):
            if file_path.name.startswith("__"):
                continue
                
            module_name = file_path.stem
            try:
                # Import the module
                spec = importlib.util.spec_from_file_location(module_name, file_path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Look for analyzer classes
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if (isinstance(attr, type) and 
                        hasattr(attr, '_is_mcp_analyzer') and 
                        attr._is_mcp_analyzer):
                        
                        self.register_analyzer(attr_name.lower(), attr)
                        
            except Exception as e:
                logger.error(f"Failed to load analyzer from {file_path}: {e}")
    
    def add_tool(self, name: str, func: Callable, description: str = None):
        """Manually add a tool function"""
        @self.mcp.tool()
        def tool_wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        
        tool_wrapper.__name__ = name
        tool_wrapper.__doc__ = description or func.__doc__
        self.tools[name] = tool_wrapper
    
    def add_resource(self, pattern: str, func: Callable, description: str = None):
        """Manually add a resource function"""
        @self.mcp.resource(pattern)
        def resource_wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        
        resource_wrapper.__doc__ = description or func.__doc__
        self.resources[pattern] = resource_wrapper
    
    def list_tools(self) -> List[str]:
        """List all registered tools"""
        return list(self.tools.keys())
    
    def list_resources(self) -> List[str]:
        """List all registered resources"""
        return list(self.resources.keys())
    
    def run(self):
        """Start the MCP server"""
        logger.info("Starting Generic MCP Server...")
        logger.info(f"Registered tools: {self.list_tools()}")
        logger.info(f"Registered resources: {self.list_resources()}")
        self.mcp.run()

# Decorators for marking analyzer classes and methods
def mcp_analyzer(cls):
    """Decorator to mark a class as an MCP analyzer"""
    cls._is_mcp_analyzer = True
    return cls

def mcp_tool(func):
    """Decorator to mark a method as an MCP tool"""
    func._is_mcp_tool = True
    return func

def mcp_resource(pattern: str):
    """Decorator to mark a method as an MCP resource"""
    def decorator(func):
        func._is_mcp_resource = True
        func._resource_pattern = pattern
        return func
    return decorator

# Base analyzer class for consistency
class BaseAnalyzer:
    """Base class for all analyzers"""
    
    def __init__(self, database_engine=None):
        self.db_engine = database_engine
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def get_user_data(self, user_id: str, table: str, filters: Dict = None) -> Dict[str, Any]:
        """Generic method to fetch user data from database"""
        if not self.db_engine:
            return {"error": "Database not available"}
        
        try:
            # This would be implemented based on your database schema
            # For now, just a placeholder
            return {"user_id": user_id, "data": "placeholder"}
        except Exception as e:
            self.logger.error(f"Database query failed: {e}")
            return {"error": str(e)}

if __name__ == "__main__":
    # Example usage
    server = GenericMCPServer("ExtensibleFinanceTools")
    
    # Load analyzers from directory
    server.load_analyzers_from_directory("analyzers")
    
    # Start server
    server.run()