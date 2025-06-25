import sys
import os

# Add the parent directory to the path to import main.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from mangum import Mangum

# Create the Mangum handler for serverless deployment
handler = Mangum(app, lifespan="off")