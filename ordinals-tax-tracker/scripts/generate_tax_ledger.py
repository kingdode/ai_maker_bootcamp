#!/usr/bin/env python3
"""
Tax Ledger Generator with Gains/Losses

Generates a CPA-style ledger with BTC amounts and calculates gains/losses using FIFO.
"""

import os
import sys
import json
import csv
from datetime import datetime, timezone
from collections import defaultdict

# Ensure we can import from the same directory
_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)


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


def generate_tax_ledger(enhanced_json_path, output_dir, address):
    """
    Generate a CPA-style tax ledger with gains/losses from enhanced transaction data.
    """
    # Load enhanced transactions (with BTC amounts)
    with open(enhanced_json_path, 'r', encoding='utf-8') as f:
        transactions = json.load(f)
    
    if not transactions:
        print("No transactions found.")
        return
    
    # Sort by timestamp (oldest first for ledger)
    transactions.sort(key=lambda x: parse_timestamp(x.get('timestamp', 0)) or datetime.min.replace(tzinfo=timezone.utc))
    
    # Prepare ledger entries with FIFO cost basis tracking
    ledger_entries = []
    running_btc_balance = 0.0
    cost_basis_queue = []  # FIFO queue: [{'date': datetime, 'cost_basis': float, 'inscription_id': str, 'txid': str}]
    cost_basis_by_inscription = {}  # Track cost basis by inscription ID for matching
    
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
        
        # Get BTC amounts (from manual entry or API)
        btc_amount = tx.get('btc_amount', 0.0)
        fee_btc = tx.get('fee_btc', 0.0)
        
        # Calculate gains/losses for SEND transactions using FIFO
        gain_loss = 0.0
        cost_basis_used = 0.0
        
        if tx_type == 'RECEIVE':
            # Purchase: add to cost basis queue and track by inscription
            debit_btc = btc_amount
            credit_btc = 0.0
            
            if debit_btc > 0 and inscription_id:
                # Add to FIFO queue
                cost_basis_queue.append({
                    'date': tx_date,
                    'cost_basis': debit_btc,
                    'inscription_id': inscription_id,
                    'txid': txid
                })
                # Also track by inscription ID for direct matching
                if inscription_id not in cost_basis_by_inscription:
                    cost_basis_by_inscription[inscription_id] = []
                cost_basis_by_inscription[inscription_id].append({
                    'date': tx_date,
                    'cost_basis': debit_btc,
                    'txid': txid
                })
            
            stats['total_received'] += 1
            stats['total_btc_received'] += debit_btc
            stats['by_type']['RECEIVE'] += 1
            
        elif tx_type == 'SEND':
            # Sale: calculate gain/loss using FIFO, matching by inscription if possible
            debit_btc = 0.0
            credit_btc = btc_amount  # Sale proceeds
            
            # Match by inscription ID (most accurate for Ordinals)
            if inscription_id and inscription_id in cost_basis_by_inscription:
                # Match this specific inscription's purchase
                if cost_basis_by_inscription[inscription_id]:
                    purchase = cost_basis_by_inscription[inscription_id].pop(0)  # FIFO for this inscription
                    cost_basis_used = purchase['cost_basis']
                    gain_loss = credit_btc - cost_basis_used
                    # Also remove from general queue if it matches
                    cost_basis_queue = [cb for cb in cost_basis_queue 
                                     if not (cb['inscription_id'] == inscription_id and 
                                            cb['txid'] == purchase['txid'])]
                else:
                    # No cost basis for this inscription (already sold or no purchase price recorded)
                    cost_basis_used = 0.0
                    gain_loss = credit_btc
            elif inscription_id:
                # Inscription exists but no cost basis recorded (gift/transfer with no purchase price)
                cost_basis_used = 0.0
                gain_loss = credit_btc
            else:
                # No inscription ID - can't match, treat as full gain
                cost_basis_used = 0.0
                gain_loss = credit_btc
            
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
            'cost_basis': cost_basis_used if tx_type == 'SEND' else (debit_btc if tx_type == 'RECEIVE' else 0.0),
            'gain_loss': gain_loss if tx_type == 'SEND' else 0.0,
            'inscription_id': inscription_id,
            'counterpart_address': counterpart,
            'txid': txid,
            'confirmed': 'Yes' if confirmed else 'No'
        })
    
    # Generate CSV ledger
    csv_path = os.path.join(output_dir, f"{address}_tax_ledger.csv")
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
    
    print(f"Saved tax ledger CSV to: {csv_path}")
    
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
        description="Generate tax ledger with gains/losses from enhanced transaction data"
    )
    parser.add_argument(
        '--address',
        required=True,
        help="Bitcoin address"
    )
    parser.add_argument(
        '--input-dir',
        default='output',
        help="Directory containing enhanced JSON files (default: output)"
    )
    parser.add_argument(
        '--output-dir',
        default='output',
        help="Output directory (default: output)"
    )
    
    args = parser.parse_args()
    
    # Try enhanced JSON first, fall back to raw JSON
    enhanced_json_path = os.path.join(args.input_dir, f"{args.address}_enhanced.json")
    if not os.path.exists(enhanced_json_path):
        raw_json_path = os.path.join(args.input_dir, f"{args.address}_raw.json")
        if os.path.exists(raw_json_path):
            print("Note: Using raw JSON (no BTC amounts). Run manual_btc_entry.py to add BTC amounts.")
            enhanced_json_path = raw_json_path
        else:
            print(f"Error: No transaction data found.")
            print(f"Expected: {enhanced_json_path} or {raw_json_path}")
            sys.exit(1)
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    print(f"Generating tax ledger for address: {args.address}")
    generate_tax_ledger(enhanced_json_path, args.output_dir, args.address)
    print("\n✓ Tax ledger generation complete!")


if __name__ == "__main__":
    main()

