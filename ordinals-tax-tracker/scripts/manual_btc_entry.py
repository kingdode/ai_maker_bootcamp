#!/usr/bin/env python3
"""
Manual BTC Amount Entry Tool

Allows you to manually enter BTC amounts for transactions that aren't captured
by the API. Creates a mapping file that can be used to enhance the ledger.
"""

import os
import sys
import json
import csv
from datetime import datetime, timezone

# Ensure we can import from the same directory
_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)


def create_btc_mapping_template(raw_json_path, output_path):
    """
    Create a CSV template for manual BTC amount entry.
    """
    # Load transactions
    with open(raw_json_path, 'r', encoding='utf-8') as f:
        transactions = json.load(f)
    
    # Create mapping file
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'Transaction ID',
            'Type',
            'Date',
            'Inscription ID',
            'BTC Amount (Purchase Price for RECEIVE, Sale Price for SEND)',
            'Fee BTC',
            'Notes'
        ])
        
        for tx in transactions:
            txid = tx.get('txid', '')
            tx_type = tx.get('type', '')
            inscription_id = tx.get('inscription_id', '')
            timestamp = tx.get('timestamp', '')
            
            # Format date
            try:
                if isinstance(timestamp, str):
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    date_str = dt.strftime('%Y-%m-%d')
                else:
                    date_str = ''
            except:
                date_str = ''
            
            writer.writerow([
                txid,
                tx_type,
                date_str,
                inscription_id,
                '',  # User fills this in
                '',  # User fills this in
                ''   # Optional notes
            ])
    
    print(f"Created BTC mapping template: {output_path}")
    print("\nInstructions:")
    print("1. Open the CSV file in Excel or a text editor")
    print("2. Fill in the 'BTC Amount' column:")
    print("   - For RECEIVE transactions: Enter the purchase price (what you paid)")
    print("   - For SEND transactions: Enter the sale price (what you received)")
    print("3. Fill in the 'Fee BTC' column if known")
    print("4. Save the file")
    print("5. Run: python3 scripts/apply_btc_mapping.py --address <ADDRESS>")


def apply_btc_mapping(raw_json_path, mapping_csv_path, output_dir, address):
    """
    Apply manual BTC amounts from mapping file to transactions.
    """
    # Load transactions
    with open(raw_json_path, 'r', encoding='utf-8') as f:
        transactions = json.load(f)
    
    # Load BTC mapping
    btc_map = {}
    with open(mapping_csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            txid = row['Transaction ID'].strip()
            btc_amount = row.get('BTC Amount (Purchase Price for RECEIVE, Sale Price for SEND)', '').strip()
            fee_btc = row.get('Fee BTC', '').strip()
            
            if txid and btc_amount:
                try:
                    btc_map[txid] = {
                        'btc_amount': float(btc_amount),
                        'fee_btc': float(fee_btc) if fee_btc else 0.0
                    }
                except ValueError:
                    print(f"Warning: Invalid BTC amount for {txid}: {btc_amount}")
    
    # Apply mapping to transactions
    enhanced_transactions = []
    for tx in transactions:
        txid = tx.get('txid', '')
        enhanced_tx = tx.copy()
        
        if txid in btc_map:
            enhanced_tx['btc_amount'] = btc_map[txid]['btc_amount']
            enhanced_tx['fee_btc'] = btc_map[txid]['fee_btc']
        else:
            enhanced_tx['btc_amount'] = 0.0
            enhanced_tx['fee_btc'] = 0.0
        
        enhanced_transactions.append(enhanced_tx)
    
    # Save enhanced transactions
    enhanced_json_path = os.path.join(output_dir, f"{address}_enhanced.json")
    with open(enhanced_json_path, 'w', encoding='utf-8') as f:
        json.dump(enhanced_transactions, f, indent=2)
    
    print(f"Applied BTC mapping. Enhanced data saved to: {enhanced_json_path}")
    print(f"\nFound BTC amounts for {len(btc_map)} transactions")
    print("\nNow run: python3 scripts/generate_ledger.py --address <ADDRESS>")
    print("Or use the enhanced JSON file for further processing.")
    
    return enhanced_json_path


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Manual BTC amount entry tool for tax calculations"
    )
    parser.add_argument(
        '--address',
        required=True,
        help="Bitcoin address"
    )
    parser.add_argument(
        '--action',
        choices=['create-template', 'apply'],
        default='create-template',
        help="Action: create-template or apply mapping"
    )
    parser.add_argument(
        '--input-dir',
        default='output',
        help="Directory containing raw JSON files (default: output)"
    )
    parser.add_argument(
        '--output-dir',
        default='output',
        help="Output directory (default: output)"
    )
    parser.add_argument(
        '--mapping-file',
        help="Path to BTC mapping CSV file (for apply action)"
    )
    
    args = parser.parse_args()
    
    raw_json_path = os.path.join(args.input_dir, f"{args.address}_raw.json")
    
    if not os.path.exists(raw_json_path):
        print(f"Error: Raw JSON file not found: {raw_json_path}")
        print("Please run ordiscan_export.py first to generate the raw data.")
        sys.exit(1)
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    if args.action == 'create-template':
        mapping_path = args.mapping_file or os.path.join(args.output_dir, f"{args.address}_btc_mapping.csv")
        create_btc_mapping_template(raw_json_path, mapping_path)
    elif args.action == 'apply':
        if not args.mapping_file:
            mapping_path = os.path.join(args.output_dir, f"{args.address}_btc_mapping.csv")
        else:
            mapping_path = args.mapping_file
        
        if not os.path.exists(mapping_path):
            print(f"Error: Mapping file not found: {mapping_path}")
            print("Run with --action create-template first to create the template.")
            sys.exit(1)
        
        apply_btc_mapping(raw_json_path, mapping_path, args.output_dir, args.address)


if __name__ == "__main__":
    main()

