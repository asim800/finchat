"""
Example Analyzer - Template for Future Analyzers
Shows how easy it is to add new analysis capabilities
"""

import json
from typing import Dict, Any
from datetime import datetime
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from generic_mcp_server import BaseAnalyzer, mcp_analyzer, mcp_tool, mcp_resource

@mcp_analyzer
class ExampleAnalyzer(BaseAnalyzer):
    """Example analyzer showing the pattern for adding new tools"""
    
    def __init__(self, database_engine=None):
        super().__init__(database_engine)
        self.example_config = os.getenv("EXAMPLE_CONFIG", "default_value")
    
    @mcp_resource("example://{user_id}")
    def resource_user_example_data(self, user_id: str) -> str:
        """Get example data for a user"""
        data = {
            "user_id": user_id,
            "example_metric": 42,
            "timestamp": datetime.now().isoformat()
        }
        return json.dumps(data, indent=2)
    
    @mcp_tool
    def tool_example_analysis(self, user_id: str, parameter: str = "default") -> Dict[str, Any]:
        """
        Example analysis tool
        
        Args:
            user_id: The user's unique identifier
            parameter: Example parameter
            
        Returns:
            Dictionary containing example analysis results
        """
        self.logger.info(f"Running example analysis for user: {user_id}")
        
        # Your analysis logic here
        result = {
            "user_id": user_id,
            "parameter": parameter,
            "analysis_result": "This is an example result",
            "score": 85.5,
            "recommendations": [
                "Example recommendation 1",
                "Example recommendation 2"
            ],
            "analysis_date": datetime.now().isoformat()
        }
        
        return result
    
    @mcp_tool
    def tool_another_example(self, data: str) -> Dict[str, Any]:
        """
        Another example tool showing flexibility
        
        Args:
            data: Input data to process
            
        Returns:
            Processed results
        """
        return {
            "processed_data": data.upper(),
            "processing_time": datetime.now().isoformat(),
            "status": "success"
        }