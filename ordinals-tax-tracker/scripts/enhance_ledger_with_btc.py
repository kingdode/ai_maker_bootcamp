#!/usr/bin/env python3
"""
Enhanced Ledger Generator with BTC Amounts

Fetches transaction details to get BTC amounts and calculates gains/losses.
"""

import os
import sys
import json
import csv
import time
from datetime import datetime, timezone
from collections import defaultdict

# Ensure we can import from the same directory
_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)

from ordiscan_client import OrdiscanClient


def parse_timestamp(ts):
    """Parse timestamp from various formats."""
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts, timezone.utc)
    elif isinstance(ts, str):
        try:
            return datetime.fromisoformat(ts.replace('Z', '+00:00'))
        except:
            try:
                return datetime.fromtimestamp(float(ts), timezone.utc)
            except:
                return None
    return None


def extract_btc_amount_from_tx_details(tx_details, address, tx_type):
    """
    Extract BTC amount from transaction details.
    For Ordinals, this is typically the transaction fee or the value transferred.
    """
    if not tx_details:
        return 0.0, 0.0  # btc_amount, fee
    
    # Try various field names for BTC amounts
    btc_amount = 0.0
    fee_btc = 0.0
    
    # Check for fee
    fee = tx_details.get('fee', tx_details.get('fee_btc', tx_details.get('fee_sats', 0)))
    if isinstance(fee, (int, float)):
        if fee > 1000:  # Likely in satoshis
            fee_btc = fee / 100000000
        else:
            fee_btc = fee
    
    # For Ordinals transactions, the BTC amount is typically:
    # - The fee paid (for sends)
    # - The value received (for receives, usually minimal)
    # Check outputs/inputs for amounts
    outputs = tx_details.get('outputs', tx_details.get('vout', []))
    inputs = tx_details.get('inputs', tx_details.get('vin', []))
    
    # Calculate total received (outputs to our address)
    total_received = 0.0
    for output in outputs:
        addresses = output.get('addresses', output.get('scriptPubKey', {}).get('addresses', []))
        if address in addresses or (isinstance(addresses, list) and address in addresses):
            value = output.get('value', output.get('amount', 0))
            if isinstance(value, (int, float)):
                total_received += value
    
    # Calculate total sent (inputs from our address)
    total_sent = 0.0
    for input_tx in inputs:
        prev_out = input_tx.get('prevout', input_tx.get('prevOut', {}))
        addresses = prev_out.get('addresses', prev_out.get('scriptPubKey', {}).get('addresses', []))
        if address in addresses or (isinstance(addresses, list) and address in addresses):
            value = prev_out.get('value', prev_out.get('amount', 0))
            if isinstance(value, (int, float)):
                total_sent += value
    
    # For Ordinals, the net amount is usually just the fee
    # But we'll use the actual received/sent amounts if available
    if tx_type == 'RECEIVE':
        btc_amount = total_received
    elif tx_type == 'SEND':
        btc_amount = total_sent - total_received  # Net sent (includes fee)
    
    return btc_amount, fee_btc


def enhance_transactions_with_btc(transactions, client, address):
    """
    Enhance transactions with BTC amounts by fetching transaction details.
    """
    enhanced = []
    total = len(transactions)
    
    print(f"\nFetching BTC amounts for {total} transactions...")
    
    for i, tx in enumerate(transactions, 1):
        txid = tx.get('txid', '')
        tx_type = tx.get('type', 'UNKNOWN')
        
        print(f"  [{i}/{total}] Fetching details for {txid[:16]}...", end=" ", flush=True)
        
        # Fetch transaction details
        tx_details = None
        try:
            tx_details = client.fetch_transaction_details(txid)
            print("✓")
        except Exception as e:
            print(f"✗ (using defaults)")
            # Continue with default values
        
        # Extract BTC amounts
        btc_amount, fee_btc = extract_btc_amount_from_tx_details(tx_details, address, tx_type)
        
        # Add BTC amounts to transaction
        enhanced_tx = tx.copy()
        enhanced_tx['btc_amount'] = btc_amount
        enhanced_tx['fee_btc'] = fee_btc
        enhanced_tx['tx_details'] = tx_details
        
        enhanced.append(enhanced_tx)
        
        # Rate limiting - small delay between requests
        if i < total:
            time.sleep(0.1)
    
    return enhanced


def generate_enhanced_ledger(raw_json_path, output_dir, address, api_key=None):
    """
    Generate a CPA-style ledger with BTC amounts from enhanced transaction data.
    """
    # Load raw data
    with open(raw_json_path, 'r', encoding='utf-8') as f:
        transactions = json.load(f)
    
    if not transactions:
        print("No transactions found.")
        return
    
    # Enhance with BTC amounts if API key provided
    if api_key:
        client = OrdiscanClient(api_key)
        transactions = enhance_transactions_with_btc(transactions, client, address)
    else:
        print("Note: No API key provided. Using default BTC amounts (0.0).")
        for tx in transactions:
            tx['btc_amount'] = 0.0
            tx['fee_btc'] = 0.0
    
    # Sort by timestamp (oldest first for ledger)
    transactions.sort(key=lambda x: parse_timestamp(x.get('timestamp', 0)) or datetime.min.replace(tzinfo=timezone.utc))
    
    # Prepare ledger entries with cost basis tracking
    ledger_entries = []
    running_btc_balance = 0.0
    cost_basis_queue = []  # FIFO queue for cost basis calculation
    
    # Track statistics
    stats = {
        'total_received': 0,
        'total_sent': 0,
        'total_btc_received': 0.0,
        'total_btc_sent': 0.0,
        'total_fees_paid': 0.0,
        'total_gains': 0.0,
        'total_losses': 0.0,
        'by_type': defaultdict(int),
        'by_month': defaultdict(lambda: {'received': 0, 'sent': 0, 'btc_received': 0.0, 'btc_sent': 0.0})
    }
    
    for tx in transactions:
        tx_date = parse_timestamp(tx.get('timestamp'))
        if not tx_date:
            continue
        
        tx_type = tx.get('type', 'UNKNOWN')
        inscription_id = tx.get('inscription_id', '')
        txid = tx.get('txid', '')
        counterpart = tx.get('counterpart_address', '')
        confirmed = tx.get('confirmed', False)
        spent_as_fee = tx.get('spent_as_fee', False)
        
        # Get BTC amounts
        btc_amount = tx.get('btc_amount', 0.0)
        fee_btc = tx.get('fee_btc', 0.0)
        
        # Calculate gains/losses for SEND transactions
        gain_loss = 0.0
        cost_basis_used = 0.0
        
        if tx_type == 'RECEIVE':
            debit_btc = btc_amount
            credit_btc = 0.0
            # Add to cost basis queue (FIFO)
            if btc_amount > 0:
                cost_basis_queue.append({
                    'date': tx_date,
                    'amount': btc_amount,
                    'cost_basis': btc_amount  # For receives, cost basis = amount received
                })
            stats['inscriptions_received'] = stats.get('inscriptions_received', 0) + 1
            stats['total_btc_received'] += btc_amount
            stats['by_type']['RECEIVE'] += 1
            month_key = tx_date.strftime('%Y-%m')
            stats['by_month'][month_key]['received'] += 1
            stats['by_month'][month_key]['btc_received'] += btc_amount
            
        elif tx_type == 'SEND':
            debit_btc = 0.0
            credit_btc = btc_amount
            # Calculate gain/loss using FIFO
            remaining_to_sell = btc_amount
            while remaining_to_sell > 0 and cost_basis_queue:
                oldest = cost_basis_queue[0]
                if oldest['amount'] <= remaining_to_sell:
                    # Use entire cost basis entry
                    cost_basis_used += oldest['cost_basis']
                    gain_loss += (oldest['amount'] - oldest['cost_basis'])
                    remaining_to_sell -= oldest['amount']
                    cost_basis_queue.pop(0)
                else:
                    # Partial use
                    portion = remaining_to_sell / oldest['amount']
                    cost_basis_used += oldest['cost_basis'] * portion
                    gain_loss += (remaining_to_sell - oldest['cost_basis'] * portion)
                    oldest['amount'] -= remaining_to_sell
                    oldest['cost_basis'] -= oldest['cost_basis'] * portion
                    remaining_to_sell = 0
            
            # If we still have remaining to sell but no cost basis, it's all gain
            if remaining_to_sell > 0:
                gain_loss += remaining_to_sell
            
            stats['inscriptions_sent'] = stats.get('inscriptions_sent', 0) + 1
            stats['total_btc_sent'] += btc_amount
            stats['total_fees_paid'] += fee_btc
            if gain_loss > 0:
                stats['total_gains'] += gain_loss
            else:
                stats['total_losses'] += abs(gain_loss)
            stats['by_type']['SEND'] += 1
            month_key = tx_date.strftime('%Y-%m')
            stats['by_month'][month_key]['sent'] += 1
            stats['by_month'][month_key]['btc_sent'] += btc_amount
        else:
            debit_btc = 0.0
            credit_btc = 0.0
        
        # Description
        desc_parts = []
        if inscription_id:
            desc_parts.append(f"Inscription: {inscription_id[:16]}...")
        if counterpart:
            desc_parts.append(f"To/From: {counterpart[:16]}...")
        if spent_as_fee:
            desc_parts.append("[SPENT AS FEE]")
        description = " | ".join(desc_parts) if desc_parts else "Transaction"
        
        # Reference
        reference = txid[:16] + "..." if len(txid) > 16 else txid
        
        # Update running balance
        running_btc_balance += (debit_btc - credit_btc)
        
        ledger_entries.append({
            'date': tx_date.strftime('%Y-%m-%d'),
            'time': tx_date.strftime('%H:%M:%S'),
            'reference': reference,
            'description': description,
            'type': tx_type,
            'debit_btc': debit_btc,
            'credit_btc': credit_btc,
            'fee_btc': fee_btc,
            'balance_btc': running_btc_balance,
            'cost_basis': cost_basis_used if tx_type == 'SEND' else btc_amount,
            'gain_loss': gain_loss if tx_type == 'SEND' else 0.0,
            'inscription_id': inscription_id,
            'counterpart_address': counterpart,
            'txid': txid,
            'confirmed': 'Yes' if confirmed else 'No',
            'spent_as_fee': 'Yes' if spent_as_fee else 'No'
        })
    
    # Generate CSV ledger
    csv_path = os.path.join(output_dir, f"{address}_ledger_with_btc.csv")
    fieldnames = [
        'Date', 'Time', 'Reference', 'Description', 'Type', 
        'Debit BTC', 'Credit BTC', 'Fee BTC', 'Balance BTC', 
        'Cost Basis', 'Gain/Loss', 'Inscription ID', 
        'Counterpart Address', 'Transaction ID', 'Confirmed', 'Spent as Fee'
    ]
    
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for entry in ledger_entries:
            writer.writerow({
                'Date': entry['date'],
                'Time': entry['time'],
                'Reference': entry['reference'],
                'Description': entry['description'],
                'Type': entry['type'],
                'Debit BTC': f"{entry['debit_btc']:.8f}",
                'Credit BTC': f"{entry['credit_btc']:.8f}",
                'Fee BTC': f"{entry['fee_btc']:.8f}",
                'Balance BTC': f"{entry['balance_btc']:.8f}",
                'Cost Basis': f"{entry['cost_basis']:.8f}",
                'Gain/Loss': f"{entry['gain_loss']:.8f}",
                'Inscription ID': entry['inscription_id'],
                'Counterpart Address': entry['counterpart_address'],
                'Transaction ID': entry['txid'],
                'Confirmed': entry['confirmed'],
                'Spent as Fee': entry['spent_as_fee']
            })
    
    print(f"\nSaved enhanced ledger CSV to: {csv_path}")
    
    # Generate summary
    summary_path = os.path.join(output_dir, f"{address}_btc_summary.txt")
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write("BITCOIN TRANSACTION SUMMARY WITH GAINS/LOSSES\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"Address: {address}\n")
        f.write(f"Period: {ledger_entries[0]['date']} to {ledger_entries[-1]['date']}\n")
        f.write(f"Total Transactions: {len(ledger_entries)}\n\n")
        
        f.write("BTC SUMMARY\n")
        f.write("-" * 80 + "\n")
        f.write(f"Total BTC Received: {stats['total_btc_received']:.8f} BTC\n")
        f.write(f"Total BTC Sent: {stats['total_btc_sent']:.8f} BTC\n")
        f.write(f"Total Fees Paid: {stats['total_fees_paid']:.8f} BTC\n")
        f.write(f"Net BTC Balance: {running_btc_balance:.8f} BTC\n\n")
        
        f.write("TAX SUMMARY (FIFO Cost Basis)\n")
        f.write("-" * 80 + "\n")
        f.write(f"Total Gains: {stats['total_gains']:.8f} BTC\n")
        f.write(f"Total Losses: {stats['total_losses']:.8f} BTC\n")
        f.write(f"Net Gain/Loss: {stats['total_gains'] - stats['total_losses']:.8f} BTC\n")
        f.write(f"Remaining Cost Basis: {sum(item['cost_basis'] for item in cost_basis_queue):.8f} BTC\n")
    
    print(f"Saved BTC summary to: {summary_path}")
    
    return csv_path, summary_path


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generate enhanced ledger with BTC amounts and gains/losses"
    )
    parser.add_argument(
        '--address',
        required=True,
        help="Bitcoin address"
    )
    parser.add_argument(
        '--api-key',
        help="Ordiscan API key (optional, for fetching BTC amounts)"
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
    
    args = parser.parse_args()
    
    raw_json_path = os.path.join(args.input_dir, f"{args.address}_raw.json")
    
    if not os.path.exists(raw_json_path):
        print(f"Error: Raw JSON file not found: {raw_json_path}")
        print("Please run ordiscan_export.py first to generate the raw data.")
        sys.exit(1)
    
    # Get API key from environment if not provided
    api_key = args.api_key or os.getenv('ORDISCAN_API_KEY')
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    print(f"Generating enhanced ledger with BTC amounts for address: {args.address}")
    generate_enhanced_ledger(raw_json_path, args.output_dir, args.address, api_key)
    print("\n✓ Enhanced ledger generation complete!")


if __name__ == "__main__":
    main()

