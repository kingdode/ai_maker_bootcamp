# Ordinals Tax Tracker

A Python tool for fetching and exporting Bitcoin address transaction data from the Ordiscan API.

## Setup

### 1. API Key Configuration

You can provide your Ordiscan API key in one of two ways:

**Option A: Environment Variable (Recommended)**
```bash
export ORDISCAN_API_KEY="your_ordiscan_api_key_here"
```

**Option B: .env File**
Create a `.env` file in the project root:
```
ORDISCAN_API_KEY=your_ordiscan_api_key_here
```

### 2. Activate Virtual Environment

Make sure your virtual environment is activated:
```bash
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate     # On Windows
```

## Usage

### Basic Usage

```bash
python3 scripts/ordiscan_export.py --address bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
```

### With Custom Output Directory

```bash
python3 scripts/ordiscan_export.py --address bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh --output-dir my_output
```

## Output Files

The script generates three files in the `output/` directory:

1. **`<address>_raw.json`** - Complete raw API response with all transaction data
2. **`<address>_transactions.csv`** - Clean, readable CSV table with columns:
   - `timestamp` - Unix timestamp
   - `date` - Human-readable date/time
   - `txid` - Transaction ID
   - `direction` - Transaction direction (in/out/self/unknown)
   - `btc_amount` - BTC amount
   - `fee_btc` - Transaction fee in BTC
   - `block_height` - Block height
   - `confirmations` - Number of confirmations
   - `note` - Additional notes/memo
   - `raw_type` - Original transaction type from API
3. **`<address>_summary.txt`** - Summary statistics including:
   - Total transaction count
   - Date range
   - Total BTC received/sent
   - Net amount
   - Total fees paid

## Features

- ✅ **Pagination Handling** - Automatically fetches all pages until exhausted
- ✅ **Rate Limit Resilience** - Exponential backoff retry on 429 errors
- ✅ **Error Handling** - Clear error messages for authentication failures
- ✅ **SSL Verification** - Secure API communication (SSL verification enabled)
- ✅ **Standard Library Only** - No external dependencies required
- ✅ **Flexible Configuration** - Easy to adjust API endpoints if needed

## Configuration

If you need to adjust the API endpoint paths, edit `scripts/ordiscan_client.py`:

```python
# Base URL for Ordiscan API
ORDISCAN_BASE_URL = "https://api.ordiscan.com"

# Endpoint path for address activity/transactions
ADDRESS_ACTIVITY_ENDPOINT = "/v1/address/{address}/activity"
```

Check the [Ordiscan API documentation](https://ordiscan.com/docs/api) for the correct endpoint paths.

## Troubleshooting

### Authentication Errors (401/403)
- Verify your API key is correct
- Check that the API key has the necessary permissions
- Ensure the API key is properly exported or set in `.env`

### Rate Limiting (429)
- The script automatically retries with exponential backoff
- If you hit persistent rate limits, wait a few minutes and try again

### No Transactions Found
- Verify the Bitcoin address is correct
- Check that the address has transaction history
- The address format should be valid (e.g., `bc1...` for bech32 addresses)

## Example Output

```
Fetching activity for address: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
  Fetching page 1... done (50 items)
  Fetching page 2... done (50 items)
  Fetching page 3... done (25 items)
  Fetching page 4... done (no more data)
Total items fetched: 125

Saving outputs to output/...
Saved raw JSON to: output/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh_raw.json
Saved CSV to: output/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh_transactions.csv
Saved summary to: output/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh_summary.txt

✓ Successfully exported 125 transactions for bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
```



