# Scripts Directory - Operational Scripts

This directory contains **operational scripts** for the Finance App that users and administrators run.

## 📁 Script Organization

### `/scripts/` (This Directory) - **Production/Operational Scripts**
- Scripts for data management and operations
- Run via `npm run` commands  
- Used by administrators and in production

### `/src/scripts/` - **Development/Testing Scripts**
- Development tools and testing utilities
- Run directly during development
- Used by developers for debugging and testing

## 🚀 Available Operational Scripts

### Price Management
```bash
npm run update-prices          # Simple price update with hardcoded values
npm run update-prices-advanced # Advanced price update with JSON config
npm run check-prices           # Check current price data
npm run clear-prices           # Clear historical price data
```

### Asset Metrics
```bash
npm run populate-metrics       # Populate sample asset metrics (API-based)
npm run populate-metrics-db    # Populate sample asset metrics (direct DB)
```

### Data Export
```bash
npm run test-csv              # Test CSV export functionality
```

### Integration Testing  
```bash
npm run test-langgraph        # Test LangGraph integration
```

---

## 💰 Price Update Scripts

Scripts for manually updating historical price data in the database.

### Simple Price Update
```bash
npm run update-prices
```
Uses hardcoded asset prices in `scripts/update-prices.ts`. Edit the `ASSET_PRICES` array directly.

### Advanced Price Update with JSON Config
```bash
npm run update-prices-advanced
```
Looks for `scripts/price-config.json` or uses example config.

```bash
npm run update-prices-advanced my-custom-prices.json
```
Uses a specific JSON config file.

## Setup

1. **Create your price config file** (recommended approach):
   ```bash
   cp scripts/price-config.example.json scripts/price-config.json
   ```

2. **Edit the config** with your asset prices:
   ```json
   {
     "description": "Daily price update for 2024-07-04",
     "date": "2024-07-04",
     "assets": [
       {
         "symbol": "AAPL",
         "price": 195.89,
         "assetType": "stock",
         "source": "manual"
       }
     ]
   }
   ```

3. **Run the update**:
   ```bash
   npm run update-prices-advanced
   ```

## Configuration Options

### JSON Config File Structure
```json
{
  "description": "Optional description of this price update",
  "date": "2024-07-04",  // Optional: defaults to current date
  "assets": [
    {
      "symbol": "AAPL",      // Required: Asset symbol
      "price": 195.89,       // Required: Current price
      "assetType": "stock",  // Optional: stock, etf, crypto, bond, etc.
      "source": "manual"     // Optional: source of the price data
    }
  ]
}
```

### Asset Types
- `stock` - Individual stocks
- `etf` - Exchange-traded funds
- `crypto` - Cryptocurrencies
- `bond` - Bonds
- `mutual_fund` - Mutual funds
- `options` - Options contracts

### Sources
- `manual` - Manually entered prices
- `api` - From automated API calls
- `yahoo` - Yahoo Finance
- `alpha_vantage` - Alpha Vantage API
- Custom source names

## Script Behavior

### Update Logic
1. **Check existing prices**: Looks for existing price records for the same symbol and date
2. **Update vs Create**: Updates existing records or creates new ones
3. **Skip unchanged**: Skips updates if price difference is less than $0.01
4. **Validation**: Validates symbol and price data before processing

### Database Table
Updates the `historical_prices` table with:
- `symbol`: Asset symbol (uppercase)
- `price`: Current price
- `date`: Price date
- `source`: Data source
- `assetType`: Type of asset
- `createdAt`: Timestamp

### Safety Features
- ✅ Validates all input data
- ✅ Prevents duplicate date entries
- ✅ Handles database connection errors
- ✅ Provides detailed logging
- ✅ Rollback on failures

## Examples

### Daily Stock Update
```json
{
  "description": "End of day stock prices",
  "date": "2024-07-04",
  "assets": [
    { "symbol": "AAPL", "price": 195.89, "assetType": "stock" },
    { "symbol": "GOOGL", "price": 140.34, "assetType": "stock" },
    { "symbol": "MSFT", "price": 378.85, "assetType": "stock" }
  ]
}
```

### Crypto Update
```json
{
  "description": "Crypto prices at market close",
  "assets": [
    { "symbol": "BTC-USD", "price": 43250.75, "assetType": "crypto", "source": "coinbase" },
    { "symbol": "ETH-USD", "price": 2380.42, "assetType": "crypto", "source": "coinbase" }
  ]
}
```

---

## 📊 Asset Metrics Scripts

### Sample Data Population
```bash
npm run populate-metrics       # Via API (requires auth)
npm run populate-metrics-db    # Direct database access
```

Populates sample financial metrics (Beta, P/E Ratio, Dividend Yield, etc.) for common stocks like AAPL, MSFT, GOOGL, TSLA, NVDA.

---

## 🐛 Troubleshooting

### Common Issues

1. **"Config file not found"**
   - Create `scripts/price-config.json` or specify a custom path
   - Check file path and permissions

2. **"Invalid data" errors**
   - Ensure all symbols are valid strings
   - Ensure all prices are positive numbers
   - Check JSON syntax

3. **Database connection errors**
   - Verify `DATABASE_URL` environment variable
   - Check database connectivity
   - Ensure Prisma is properly configured

4. **Permission errors**
   - Ensure you have write access to the database
   - Check file system permissions for config files

### Debug Mode
Add more logging by editing the scripts or check the database directly:
```sql
SELECT * FROM historical_prices WHERE date >= '2024-07-04' ORDER BY date DESC;
SELECT * FROM asset_metrics ORDER BY symbol;
```