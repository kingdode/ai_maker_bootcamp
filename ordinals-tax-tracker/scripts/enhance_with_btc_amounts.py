#!/usr/bin/env python3
"""
Enhance Ledger with BTC Amounts from Transaction Details

Fetches detailed transaction data to extract BTC amounts and calculate gains/losses.
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


def extract_btc_from_transaction(tx_details, address, tx_type):
    """
    Extract BTC amounts from transaction details.
    For Ordinals, we need to look at inputs/outputs to find amounts.
    """
    if not tx_details:
        return 0.0, 0.0, 0.0  # received, sent, fee
    
    received_btc = 0.0
    sent_btc = 0.0
    fee_btc = 0.0
    
    # Extract fee
    fee = tx_details.get('fee', tx_details.get('fee_btc', tx_details.get('fee_sats', 0)))
    if isinstance(fee, (int, float)):
        if fee > 1000:  # Likely in satoshis
            fee_btc = fee / 100000000
        else:
            fee_btc = fee
    
    # Check for inputs/outputs
    inputs = tx_details.get('inputs', tx_details.get('vin', []))
    outputs = tx_details.get('outputs', tx_details.get('vout', []))
    
    # Calculate amounts from inputs (what we sent)
    for input_tx in inputs:
        prev_out = input_tx.get('prevout', input_tx.get('prevOut', {}))
        if not prev_out:
            continue
        
        # Check if this input is from our address
        addresses = prev_out.get('addresses', [])
        if isinstance(addresses, str):
            addresses = [addresses]
        elif not isinstance(addresses, list):
            script_pubkey = prev_out.get('scriptPubKey', {})
            addresses = script_pubkey.get('addresses', [])
            if isinstance(addresses, str):
                addresses = [addresses]
        
        # Check if our address is in the input
        if address in addresses:
            value = prev_out.get('value', prev_out.get('amount', 0))
            if isinstance(value, (int, float)):
                sent_btc += value
    
    # Calculate amounts from outputs (what we received)
    for output in outputs:
        addresses = output.get('addresses', [])
        if isinstance(addresses, str):
            addresses = [addresses]
        elif not isinstance(addresses, list):
            script_pubkey = output.get('scriptPubKey', {})
            addresses = script_pubkey.get('addresses', [])
            if isinstance(addresses, str):
                addresses = [addresses]
        
        # Check if our address is in the output
        if address in addresses:
            value = output.get('value', output.get('amount', 0))
            if isinstance(value, (int, float)):
                received_btc += value
    
    # For Ordinals transactions, the actual sale/purchase price might be in marketplace data
    # Check for order/marketplace information
    order = tx_details.get('order', tx_details.get('marketplace', {}))
    if order:
        price = order.get('price', order.get('amount', 0))
        if isinstance(price, (int, float)):
            if tx_type == 'RECEIVE':
                # This is what we paid to buy
                received_btc = price if price > received_btc else received_btc
            elif tx_type == 'SEND':
                # This is what we received from sale
                sent_btc = price if price > sent_btc else sent_btc
    
    return received_btc, sent_btc, fee_btc


def enhance_transactions_with_btc(transactions, client, address):
    """
    Enhance transactions with BTC amounts by fetching transaction details.
    """
    enhanced = []
    total = len(transactions)
    
    print(f"\nFetching BTC amounts for {total} transactions...")
    print("This may take a while due to API rate limits...\n")
    
    for i, tx in enumerate(transactions, 1):
        txid = tx.get('txid', '')
        tx_type = tx.get('type', 'UNKNOWN')
        
        print(f"  [{i}/{total}] {txid[:16]}... ({tx_type})", end=" ", flush=True)
        
        # Fetch transaction details
        tx_details = None
        try:
            tx_details = client.fetch_transaction_details(txid)
            if tx_details:
                print("✓")
            else:
                print("✗ (no details)")
        except Exception as e:
            print(f"✗ ({str(e)[:30]})")
            # Continue with default values
        
        # Extract BTC amounts
        received_btc, sent_btc, fee_btc = extract_btc_from_transaction(tx_details, address, tx_type)
        
        # Determine the BTC amount based on transaction type
        if tx_type == 'RECEIVE':
            btc_amount = received_btc  # What we paid to receive
        elif tx_type == 'SEND':
            btc_amount = sent_btc  # What we received from sale
        else:
            btc_amount = 0.0
        
        # Add BTC amounts to transaction
        enhanced_tx = tx.copy()
        enhanced_tx['btc_amount'] = btc_amount
        enhanced_tx['received_btc'] = received_btc
        enhanced_tx['sent_btc'] = sent_btc
        enhanced_tx['fee_btc'] = fee_btc
        enhanced_tx['tx_details'] = tx_details
        
        enhanced.append(enhanced_tx)
        
        # Rate limiting - small delay between requests
        if i < total:
            time.sleep(0.2)  # 200ms delay to avoid rate limits
    
    return enhanced


def generate_ledger_with_gains_losses(raw_json_path, output_dir, address, api_key):
    """
    Generate a CPA-style ledger with BTC amounts and gains/losses calculations.
    """
    # Load raw data
    with open(raw_json_path, 'r', encoding='utf-8') as f:
        transactions = json.load(f)
    
    if not transactions:
        print("No transactions found.")
        return
    
    # Enhance with BTC amounts
    client = OrdiscanClient(api_key)
    transactions = enhance_transactions_with_btc(transactions, client, address)
    
    # Sort by timestamp (oldest first for ledger)
    transactions.sort(key=lambda x: parse_timestamp(x.get('timestamp', 0)) or datetime.min.replace(tzinfo=timezone.utc))
    
    # Prepare ledger entries with FIFO cost basis tracking
    ledger_entries = []
    running_btc_balance = 0.0
    cost_basis_queue = []  # FIFO queue: [{'date': datetime, 'amount': float, 'cost_basis': float, 'inscription_id': str}]
    
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
        
        # Get BTC amounts
        btc_amount = tx.get('btc_amount', 0.0)
        received_btc = tx.get('received_btc', 0.0)
        sent_btc = tx.get('sent_btc', 0.0)
        fee_btc = tx.get('fee_btc', 0.0)
        
        # Calculate gains/losses for SEND transactions using FIFO
        gain_loss = 0.0
        cost_basis_used = 0.0
        
        if tx_type == 'RECEIVE':
            # Purchase: add to cost basis queue
            debit_btc = btc_amount if btc_amount > 0 else received_btc
            credit_btc = 0.0
            
            if debit_btc > 0:
                cost_basis_queue.append({
                    'date': tx_date,
                    'amount': 1.0,  # 1 inscription
                    'cost_basis': debit_btc,
                    'inscription_id': inscription_id,
                    'txid': txid
                })
            
            stats['total_received'] += 1
            stats['total_btc_received'] += debit_btc
            stats['by_type']['RECEIVE'] += 1
            
        elif tx_type == 'SEND':
            # Sale: calculate gain/loss using FIFO
            debit_btc = 0.0
            credit_btc = btc_amount if btc_amount > 0 else sent_btc
            
            # Use FIFO to match this sale with purchases
            remaining_to_sell = 1.0  # 1 inscription
            while remaining_to_sell > 0 and cost_basis_queue:
                oldest = cost_basis_queue[0]
                
                if oldest['amount'] <= remaining_to_sell:
                    # Use entire cost basis entry
                    cost_basis_used += oldest['cost_basis']
                    sale_proceeds = credit_btc
                    gain_loss += (sale_proceeds - oldest['cost_basis'])
                    remaining_to_sell -= oldest['amount']
                    cost_basis_queue.pop(0)
                else:
                    # Partial use
                    portion = remaining_to_sell / oldest['amount']
                    cost_basis_portion = oldest['cost_basis'] * portion
                    cost_basis_used += cost_basis_portion
                    sale_proceeds = credit_btc
                    gain_loss += (sale_proceeds - cost_basis_portion)
                    oldest['amount'] -= remaining_to_sell
                    oldest['cost_basis'] -= cost_basis_portion
                    remaining_to_sell = 0
            
            # If we still have remaining to sell but no cost basis, it's all gain
            if remaining_to_sell > 0:
                gain_loss += credit_btc
            
            stats['total_sent'] += 1
            stats['total_btc_sent'] += credit_btc
            stats['total_fees_paid'] += fee_btc
            if gain_loss > 0:
                stats['total_gains'] += gain_loss
            else:
                stats['total_losses'] += abs(gain_loss)
            stats['by_type']['SEND'] += 1
        else:
            debit_btc = 0.0
            credit_btc = 0.0
        
        # Description
        desc_parts = []
        if inscription_id:
            desc_parts.append(f"Inscription: {inscription_id[:16]}...")
        if counterpart:
            desc_parts.append(f"To/From: {counterpart[:16]}...")
        description = " | ".join(desc_parts) if desc_parts else "Transaction"
        
        # Update running balance
        running_btc_balance += (debit_btc - credit_btc)
        
        ledger_entries.append({
            'date': tx_date.strftime('%Y-%m-%d'),
            'time': tx_date.strftime('%H:%M:%S'),
            'reference': txid[:16] + "...",
            'description': description,
            'type': tx_type,
            'debit_btc': debit_btc,
            'credit_btc': credit_btc,
            'fee_btc': fee_btc,
            'balance_btc': running_btc_balance,
            'cost_basis': cost_basis_used if tx_type == 'SEND' else debit_btc,
            'gain_loss': gain_loss if tx_type == 'SEND' else 0.0,
            'inscription_id': inscription_id,
            'counterpart_address': counterpart,
            'txid': txid,
            'confirmed': 'Yes' if confirmed else 'No'
        })
    
    # Generate CSV ledger
    csv_path = os.path.join(output_dir, f"{address}_ledger_with_btc.csv")
    fieldnames = [
        'Date', 'Time', 'Reference', 'Description', 'Type', 
        'Debit BTC', 'Credit BTC', 'Fee BTC', 'Balance BTC', 
        'Cost Basis', 'Gain/Loss BTC', 'Inscription ID', 
        'Counterpart Address', 'Transaction ID', 'Confirmed'
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
                'Gain/Loss BTC': f"{entry['gain_loss']:.8f}",
                'Inscription ID': entry['inscription_id'],
                'Counterpart Address': entry['counterpart_address'],
                'Transaction ID': entry['txid'],
                'Confirmed': entry['confirmed']
            })
    
    print(f"\nSaved enhanced ledger CSV to: {csv_path}")
    
    # Generate summary
    summary_path = os.path.join(output_dir, f"{address}_tax_summary.txt")
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write("TAX SUMMARY REPORT - GAINS & LOSSES\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"Address: {address}\n")
        f.write(f"Period: {ledger_entries[0]['date']} to {ledger_entries[-1]['date']}\n")
        f.write(f"Total Transactions: {len(ledger_entries)}\n\n")
        
        f.write("BTC SUMMARY\n")
        f.write("-" * 80 + "\n")
        f.write(f"Total BTC Received (Purchases): {stats['total_btc_received']:.8f} BTC\n")
        f.write(f"Total BTC Sent (Sales): {stats['total_btc_sent']:.8f} BTC\n")
        f.write(f"Total Fees Paid: {stats['total_fees_paid']:.8f} BTC\n")
        f.write(f"Net BTC Balance: {running_btc_balance:.8f} BTC\n\n")
        
        f.write("TAX CALCULATIONS (FIFO Cost Basis)\n")
        f.write("-" * 80 + "\n")
        f.write(f"Total Gains: {stats['total_gains']:.8f} BTC\n")
        f.write(f"Total Losses: {stats['total_losses']:.8f} BTC\n")
        f.write(f"Net Gain/Loss: {stats['total_gains'] - stats['total_losses']:.8f} BTC\n")
        f.write(f"Remaining Cost Basis (Unrealized): {sum(item['cost_basis'] for item in cost_basis_queue):.8f} BTC\n")
        f.write(f"Remaining Holdings: {len(cost_basis_queue)} inscriptions\n")
    
    print(f"Saved tax summary to: {summary_path}")
    
    return csv_path, summary_path


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Enhance ledger with BTC amounts and calculate gains/losses"
    )
    parser.add_argument(
        '--address',
        required=True,
        help="Bitcoin address"
    )
    parser.add_argument(
        '--api-key',
        help="Ordiscan API key (optional, uses ORDISCAN_API_KEY env var if not provided)"
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
    
    # Get API key
    api_key = args.api_key or os.getenv('ORDISCAN_API_KEY')
    if not api_key:
        print("Error: ORDISCAN_API_KEY not found.")
        print("Please set it as an environment variable or use --api-key")
        sys.exit(1)
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    print(f"Enhancing ledger with BTC amounts for address: {args.address}")
    generate_ledger_with_gains_losses(raw_json_path, args.output_dir, args.address, api_key)
    print("\n✓ Enhanced ledger generation complete!")


if __name__ == "__main__":
    main()

