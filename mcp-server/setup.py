#!/usr/bin/env python3
"""
Setup script for Finance MCP Server
Installs required dependencies and tests the server
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"   Error: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} is not compatible")
        print("   Requires Python 3.8 or higher")
        return False

def install_dependencies():
    """Install required Python packages"""
    requirements_file = Path(__file__).parent / "requirements.txt"
    
    if not requirements_file.exists():
        print(f"❌ Requirements file not found: {requirements_file}")
        return False
    
    # Create virtual environment (optional but recommended)
    print("🔧 Setting up virtual environment...")
    venv_path = Path(__file__).parent / "venv"
    
    if not venv_path.exists():
        if not run_command(f"python3 -m venv {venv_path}", "Creating virtual environment"):
            return False
    
    # Install packages
    pip_command = f"{venv_path}/bin/pip" if venv_path.exists() else "pip3"
    return run_command(f"{pip_command} install -r {requirements_file}", "Installing dependencies")

def test_imports():
    """Test if all required packages can be imported"""
    print("🔧 Testing package imports...")
    
    required_packages = [
        "pandas",
        "numpy", 
        "yfinance",
        "sqlalchemy",
        "psycopg2",
        "mcp",
        "fastmcp"
    ]
    
    failed_imports = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"  ✅ {package}")
        except ImportError as e:
            print(f"  ❌ {package}: {e}")
            failed_imports.append(package)
    
    if failed_imports:
        print(f"\n❌ Failed to import: {', '.join(failed_imports)}")
        return False
    else:
        print("✅ All required packages imported successfully")
        return True

def test_database_connection():
    """Test database connection"""
    print("🔧 Testing database connection...")
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("⚠️  DATABASE_URL not set - skipping database test")
        print("   Set DATABASE_URL environment variable to test database connection")
        return True
    
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("   Check your DATABASE_URL and database availability")
        return False

def main():
    """Main setup function"""
    print("🚀 Finance MCP Server Setup")
    print("=" * 40)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        print("\n❌ Setup failed during dependency installation")
        sys.exit(1)
    
    # Test imports
    if not test_imports():
        print("\n❌ Setup failed during import testing")
        sys.exit(1)
    
    # Test database connection
    if not test_database_connection():
        print("\n⚠️  Setup completed with database connection issues")
        print("   MCP server may not work properly without database access")
    
    print("\n" + "=" * 40)
    print("🎉 Finance MCP Server setup completed!")
    print("\nNext steps:")
    print("1. Set DATABASE_URL environment variable if not already set")
    print("2. Run the MCP server: python3 finance_mcp_server.py")
    print("3. Test with your Next.js application")
    
    # Display activation instructions
    venv_path = Path(__file__).parent / "venv"
    if venv_path.exists():
        print(f"\nTo activate virtual environment:")
        print(f"  source {venv_path}/bin/activate")

if __name__ == "__main__":
    main()