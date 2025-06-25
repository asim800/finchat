from http.server import BaseHTTPRequestHandler
import json
import sys
import os

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        debug_info = {
            "status": "debugging",
            "python_version": sys.version,
            "python_path": sys.path[:3],  # First 3 entries
            "environment_vars": {
                "DATABASE_URL": "present" if os.getenv("DATABASE_URL") else "missing",
                "PWD": os.getenv("PWD"),
            }
        }
        
        # Test imports one by one
        try:
            import pandas
            debug_info["pandas"] = "✅ imported"
        except Exception as e:
            debug_info["pandas"] = f"❌ {str(e)}"
            
        try:
            import fastapi
            debug_info["fastapi"] = "✅ imported"
        except Exception as e:
            debug_info["fastapi"] = f"❌ {str(e)}"
            
        try:
            import mangum
            debug_info["mangum"] = "✅ imported"
        except Exception as e:
            debug_info["mangum"] = f"❌ {str(e)}"
        
        self.wfile.write(json.dumps(debug_info, indent=2).encode())
        return