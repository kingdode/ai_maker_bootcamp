#!/usr/bin/env python3
"""
Ordiscan Address Activity Exporter

This script fetches all transaction activity for a Bitcoin address from the Ordiscan API
and exports it to JSON, CSV, and summary text files.

Usage:
    export ORDISCAN_API_KEY="your_key_here"
    python3 scripts/ordiscan_export.py --address bc1...

Or with .env file:
    python3 scripts/ordiscan_export.py --address bc1...
"""

import os
import sys
import json
import csv
import argparse
from datetime import datetime, timezone

# Ensure we can import from the same directory
_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)

from ordiscan_client import OrdiscanClient


def load_env_file(env_path='.env'):
    """
    Load environment variables from a .env file.
    Simple parser that handles KEY=VALUE format.
    """
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue
                # Parse KEY=VALUE
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    env_vars[key] = value
    return env_vars


def get_api_key():
    """
    Get API key from environment variable or .env file.
    """
    # First check environment variable
    api_key = os.getenv('ORDISCAN_API_KEY')
    if api_key:
        return api_key
    
    # Then check .env file
    env_vars = load_env_file()
    api_key = env_vars.get('ORDISCAN_API_KEY')
    if api_key:
        return api_key
    
    return None


def extract_timestamp(item):
    """Extract timestamp from various possible field names."""
    for field in ['timestamp', 'time', 'created_at', 'date', 'block_time']:
        if field in item and item[field]:
            ts = item[field]
            # Handle Unix timestamp (int or float)
            if isinstance(ts, (int, float)):
                return int(ts)
            # Handle ISO format strings
            if isinstance(ts, str):
                try:
                    dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    return int(dt.timestamp())
                except:
                    pass
    return 0


def determine_direction(item, address):
    """
    Determine transaction direction based on available fields.
    Common patterns: 'direction', 'type', 'incoming'/'outgoing', or analyze inputs/outputs
    """
    # Check common field names
    direction = item.get('direction', item.get('type', item.get('tx_type', ''))).lower()
    if direction in ['in', 'incoming', 'receive', 'received']:
        return 'in'
    elif direction in ['out', 'outgoing', 'send', 'sent']:
        return 'out'
    elif direction in ['self', 'internal']:
        return 'self'
    
    # Try to infer from amount (negative = out, positive = in)
    amount = item.get('amount', item.get('value', item.get('btc_amount', 0)))
    if isinstance(amount, (int, float)):
        if amount < 0:
            return 'out'
        elif amount > 0:
            return 'in'
    
    return 'unknown'


def extract_btc_amount(item):
    """Extract BTC amount from various possible field names."""
    for field in ['btc_amount', 'amount', 'value', 'sats', 'satoshis']:
        if field in item:
            val = item[field]
            if isinstance(val, (int, float)):
                # If it's in satoshis, convert to BTC
                if field in ['sats', 'satoshis']:
                    return val / 100000000
                return val
    return 0.0


def save_raw_json(address, data, output_dir):
    """Save raw JSON response."""
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, f"{address}_raw.json")
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved raw JSON to: {filepath}")
    return filepath


def save_transactions_csv(address, transactions, output_dir):
    """Save transactions as CSV with required columns."""
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, f"{address}_transactions.csv")
    
    fieldnames = [
        'timestamp', 'date', 'txid', 'direction', 'btc_amount',
        'fee_btc', 'block_height', 'confirmations', 'note', 'raw_type'
    ]
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for item in transactions:
            timestamp = extract_timestamp(item)
            date_str = ''
            if timestamp > 0:
                try:
                    date_str = datetime.fromtimestamp(timestamp, timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
                except:
                    date_str = ''
            
            txid = item.get('txid', item.get('tx_id', item.get('hash', item.get('transaction_hash', ''))))
            direction = determine_direction(item, address)
            btc_amount = extract_btc_amount(item)
            
            # Extract fee
            fee_btc = item.get('fee', item.get('fee_btc', item.get('fee_sats', 0)))
            if isinstance(fee_btc, int) and fee_btc > 1000:  # Likely in satoshis
                fee_btc = fee_btc / 100000000
            
            block_height = item.get('block_height', item.get('height', item.get('block', '')))
            confirmations = item.get('confirmations', item.get('confirmation_count', ''))
            note = item.get('note', item.get('memo', item.get('description', '')))
            raw_type = item.get('type', item.get('tx_type', item.get('kind', '')))
            
            writer.writerow({
                'timestamp': timestamp,
                'date': date_str,
                'txid': txid,
                'direction': direction,
                'btc_amount': btc_amount,
                'fee_btc': fee_btc,
                'block_height': block_height,
                'confirmations': confirmations,
                'note': str(note) if note else '',
                'raw_type': str(raw_type) if raw_type else ''
            })
    
    print(f"Saved CSV to: {filepath}")
    return filepath


def save_summary(address, transactions, output_dir):
    """Save summary statistics."""
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, f"{address}_summary.txt")
    
    total_transactions = len(transactions)
    
    if total_transactions == 0:
        date_range = "N/A"
        total_btc_received = 0.0
        total_btc_sent = 0.0
        total_fees = 0.0
    else:
        # Extract timestamps and calculate date range
        timestamps = [extract_timestamp(tx) for tx in transactions if extract_timestamp(tx) > 0]
        if timestamps:
            min_date = datetime.fromtimestamp(min(timestamps), timezone.utc)
            max_date = datetime.fromtimestamp(max(timestamps), timezone.utc)
            date_range = f"{min_date.strftime('%Y-%m-%d')} to {max_date.strftime('%Y-%m-%d')}"
        else:
            date_range = "N/A"
        
        # Calculate totals
        total_btc_received = 0.0
        total_btc_sent = 0.0
        total_fees = 0.0
        
        for tx in transactions:
            amount = extract_btc_amount(tx)
            direction = determine_direction(tx, address)
            
            if direction == 'in':
                total_btc_received += abs(amount)
            elif direction == 'out':
                total_btc_sent += abs(amount)
            
            fee = tx.get('fee', tx.get('fee_btc', tx.get('fee_sats', 0)))
            if isinstance(fee, (int, float)):
                if fee > 1000:  # Likely in satoshis
                    fee = fee / 100000000
                total_fees += abs(fee)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"Address Activity Summary\n")
        f.write(f"{'=' * 50}\n\n")
        f.write(f"Address: {address}\n")
        f.write(f"Total Transactions: {total_transactions}\n")
        f.write(f"Date Range: {date_range}\n\n")
        f.write(f"Total BTC Received: {total_btc_received:.8f} BTC\n")
        f.write(f"Total BTC Sent: {total_btc_sent:.8f} BTC\n")
        f.write(f"Net Amount: {total_btc_received - total_btc_sent:.8f} BTC\n")
        f.write(f"Total Fees Paid: {total_fees:.8f} BTC\n")
    
    print(f"Saved summary to: {filepath}")
    return filepath


def main():
    parser = argparse.ArgumentParser(
        description="Fetch and export Bitcoin address activity from Ordiscan API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Using environment variable:
  export ORDISCAN_API_KEY="your_key_here"
  python3 scripts/ordiscan_export.py --address bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh

  # Using .env file (create .env with ORDISCAN_API_KEY=your_key_here):
  python3 scripts/ordiscan_export.py --address bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
        """
    )
    parser.add_argument(
        '--address',
        required=True,
        help="Bitcoin address (e.g., bc1...)"
    )
    parser.add_argument(
        '--output-dir',
        default='output',
        help="Output directory (default: output)"
    )
    
    args = parser.parse_args()
    
    # Get API key
    api_key = get_api_key()
    if not api_key:
        print("Error: ORDISCAN_API_KEY not found.")
        print("\nPlease set it using one of these methods:")
        print("  1. Export as environment variable:")
        print("     export ORDISCAN_API_KEY='your_key_here'")
        print("  2. Create a .env file in the project root with:")
        print("     ORDISCAN_API_KEY=your_key_here")
        sys.exit(1)
    
    # Initialize client and fetch data
    try:
        client = OrdiscanClient(api_key)
        transactions = client.fetch_address_activity(args.address)
        
        if not transactions:
            print(f"\nNo transactions found for address: {args.address}")
            sys.exit(0)
        
        # Save outputs
        print(f"\nSaving outputs to {args.output_dir}/...")
        save_raw_json(args.address, transactions, args.output_dir)
        save_transactions_csv(args.address, transactions, args.output_dir)
        save_summary(args.address, transactions, args.output_dir)
        
        print(f"\n✓ Successfully exported {len(transactions)} transactions for {args.address}")
        
    except PermissionError as e:
        print(f"\n✗ Authentication Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

