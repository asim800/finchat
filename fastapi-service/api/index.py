from http.server import BaseHTTPRequestHandler
import sys
import os
import json
from urllib.parse import urlparse, parse_qs
import io

# Add the parent directory to the path to import main.py  
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Import FastAPI app here to avoid import-time issues
            from main import app
            
            # Simple routing for health check
            if self.path == '/health' or self.path == '/':
                response = {
                    "service": "Portfolio Analysis API",
                    "version": "1.0.0", 
                    "status": "healthy",
                    "message": "FastAPI service running on Vercel"
                }
                
                # Test database connection
                try:
                    from main import get_engine
                    from sqlalchemy import text
                    engine = get_engine()
                    with engine.connect() as conn:
                        result = conn.execute(text("SELECT 1 as test"))
                        response["database"] = "connected"
                        response["database_test"] = "passed"
                except Exception as e:
                    response["database"] = "failed"
                    response["database_error"] = str(e)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
            else:
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Not found"}).encode())
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error_response = {"error": f"Server error: {str(e)}"}
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_POST(self):
        try:
            # Import here to avoid startup issues
            from main import app
            from fastapi.testclient import TestClient
            
            # Create test client for FastAPI
            client = TestClient(app)
            
            # Get content length and read body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length) if content_length > 0 else b''
            
            # Route to appropriate FastAPI endpoints
            if self.path == '/portfolio/risk':
                response = client.post('/portfolio/risk', content=post_data, headers={'Content-Type': 'application/json'})
            elif self.path == '/portfolio/sharpe':
                response = client.post('/portfolio/sharpe', content=post_data, headers={'Content-Type': 'application/json'})
            elif self.path == '/portfolio/market-data':
                response = client.post('/portfolio/market-data', content=post_data, headers={'Content-Type': 'application/json'})
            else:
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode())
                return
            
            # Send FastAPI response
            self.send_response(response.status_code)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(response.content)
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error_response = {"error": f"Server error: {str(e)}"}
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()