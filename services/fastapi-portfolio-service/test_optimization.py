#!/usr/bin/env python3
"""
Test script for portfolio optimization endpoint
"""

import json
from main import app
from fastapi.testclient import TestClient

def test_portfolio_optimization():
    """Test the portfolio optimization endpoint"""
    client = TestClient(app)
    
    # Test data - simple portfolio
    test_data = {
        "assets": [
            {"symbol": "AAPL", "shares": 100},
            {"symbol": "GOOGL", "shares": 50},
            {"symbol": "MSFT", "shares": 75}
        ],
        "objective": "max_sharpe",
        "risk_tolerance": 0.5
    }
    
    print("Testing portfolio optimization endpoint...")
    print(f"Request data: {json.dumps(test_data, indent=2)}")
    
    try:
        response = client.post("/portfolio/optimize", json=test_data)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Optimization endpoint works!")
            print(f"Expected Return: {result['expected_return']}%")
            print(f"Expected Volatility: {result['expected_volatility']}%")
            print(f"Sharpe Ratio: {result['sharpe_ratio']}")
            print(f"Rebalancing Cost: ${result['rebalancing_cost_estimate']}")
            
            # Show top recommendations
            print("\nTop Recommendations:")
            for allocation in result['allocations'][:3]:
                if allocation['recommended_action'] != 'hold':
                    print(f"  {allocation['recommended_action'].upper()} {allocation['symbol']}: {allocation['shares_to_trade']} shares")
            
            return True
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def test_monte_carlo():
    """Test the Monte Carlo simulation endpoint"""
    client = TestClient(app)
    
    # Test data - simple portfolio
    test_data = {
        "assets": [
            {"symbol": "AAPL", "shares": 100},
            {"symbol": "GOOGL", "shares": 50}
        ],
        "time_horizon_years": 5,
        "simulations": 1000,  # Smaller number for testing
        "initial_investment": 50000
    }
    
    print("\nTesting Monte Carlo simulation endpoint...")
    print(f"Request data: {json.dumps(test_data, indent=2)}")
    
    try:
        response = client.post("/portfolio/monte-carlo", json=test_data)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Monte Carlo endpoint works!")
            print(f"Expected Final Value: ${result['expected_final_value']:,.2f}")
            print(f"Probability of Loss: {result['probability_of_loss']:.1%}")
            print(f"50th Percentile: ${result['percentile_outcomes']['50th']:,.2f}")
            print(f"5th Percentile: ${result['percentile_outcomes']['5th']:,.2f}")
            print(f"95th Percentile: ${result['percentile_outcomes']['95th']:,.2f}")
            
            return True
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing FastAPI Portfolio Optimization Service")
    print("=" * 60)
    
    success_count = 0
    total_tests = 2
    
    if test_portfolio_optimization():
        success_count += 1
    
    if test_monte_carlo():
        success_count += 1
    
    print("=" * 60)
    print(f"Tests completed: {success_count}/{total_tests} passed")
    
    if success_count == total_tests:
        print("🎉 All tests passed! FastAPI service is ready for production.")
    else:
        print("⚠️  Some tests failed. Please check the implementation.")