#!/usr/bin/env python3
"""
CPA-Style Ledger Generator

Generates a professional accounting ledger from Ordiscan transaction data.
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
            # Try ISO format
            return datetime.fromisoformat(ts.replace('Z', '+00:00'))
        except:
            try:
                # Try Unix timestamp as string
                return datetime.fromtimestamp(float(ts), timezone.utc)
            except:
                return None
    return None


def generate_ledger(raw_json_path, output_dir, address):
    """
    Generate a CPA-style ledger from raw JSON transaction data.
    """
    # Load raw data
    with open(raw_json_path, 'r', encoding='utf-8') as f:
        transactions = json.load(f)
    
    if not transactions:
        print("No transactions found.")
        return
    
    # Sort by timestamp (oldest first for ledger)
    transactions.sort(key=lambda x: parse_timestamp(x.get('timestamp', 0)) or datetime.min.replace(tzinfo=timezone.utc))
    
    # Prepare ledger entries
    ledger_entries = []
    running_balance = 0.0
    
    # Track statistics
    stats = {
        'total_received': 0,
        'total_sent': 0,
        'inscriptions_received': 0,
        'inscriptions_sent': 0,
        'by_type': defaultdict(int),
        'by_month': defaultdict(lambda: {'received': 0, 'sent': 0})
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
        
        # Determine debit/credit
        if tx_type == 'RECEIVE':
            debit = 1  # Incoming inscription
            credit = 0
            stats['inscriptions_received'] += 1
            stats['by_type']['RECEIVE'] += 1
            stats['by_month'][tx_date.strftime('%Y-%m')]['received'] += 1
        elif tx_type == 'SEND':
            debit = 0
            credit = 1  # Outgoing inscription
            stats['inscriptions_sent'] += 1
            stats['by_type']['SEND'] += 1
            stats['by_month'][tx_date.strftime('%Y-%m')]['sent'] += 1
        else:
            debit = 0
            credit = 0
        
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
        
        # Extract BTC amounts (if available in transaction data)
        btc_amount = tx.get('btc_amount', tx.get('amount', tx.get('value', 0.0)))
        fee_btc = tx.get('fee', tx.get('fee_btc', tx.get('fee_sats', 0.0)))
        
        # Convert satoshis to BTC if needed
        if isinstance(fee_btc, (int, float)) and fee_btc > 1000:
            fee_btc = fee_btc / 100000000
        if isinstance(btc_amount, (int, float)) and btc_amount > 1000:
            btc_amount = btc_amount / 100000000
        
        # Calculate BTC debit/credit
        if tx_type == 'RECEIVE':
            debit_btc = btc_amount if btc_amount > 0 else 0.0
            credit_btc = 0.0
        elif tx_type == 'SEND':
            debit_btc = 0.0
            credit_btc = btc_amount if btc_amount > 0 else 0.0
        else:
            debit_btc = 0.0
            credit_btc = 0.0
        
        ledger_entries.append({
            'date': tx_date.strftime('%Y-%m-%d'),
            'time': tx_date.strftime('%H:%M:%S'),
            'reference': reference,
            'description': description,
            'type': tx_type,
            'debit': debit,
            'credit': credit,
            'balance': running_balance + (debit - credit),
            'debit_btc': debit_btc,
            'credit_btc': credit_btc,
            'fee_btc': fee_btc if isinstance(fee_btc, (int, float)) else 0.0,
            'inscription_id': inscription_id,
            'counterpart_address': counterpart,
            'txid': txid,
            'confirmed': 'Yes' if confirmed else 'No',
            'spent_as_fee': 'Yes' if spent_as_fee else 'No'
        })
        
        running_balance += (debit - credit)
    
    # Generate CSV ledger
    csv_path = os.path.join(output_dir, f"{address}_ledger.csv")
    fieldnames = [
        'Date', 'Time', 'Reference', 'Description', 'Type', 
        'Debit', 'Credit', 'Balance', 
        'Debit BTC', 'Credit BTC', 'Fee BTC',
        'Inscription ID', 
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
                'Debit': entry['debit'],
                'Credit': entry['credit'],
                'Balance': entry['balance'],
                'Debit BTC': f"{entry.get('debit_btc', 0.0):.8f}",
                'Credit BTC': f"{entry.get('credit_btc', 0.0):.8f}",
                'Fee BTC': f"{entry.get('fee_btc', 0.0):.8f}",
                'Inscription ID': entry['inscription_id'],
                'Counterpart Address': entry['counterpart_address'],
                'Transaction ID': entry['txid'],
                'Confirmed': entry['confirmed'],
                'Spent as Fee': entry['spent_as_fee']
            })
    
    print(f"Saved ledger CSV to: {csv_path}")
    
    # Generate formatted text ledger
    txt_path = os.path.join(output_dir, f"{address}_ledger.txt")
    with open(txt_path, 'w', encoding='utf-8') as f:
        # Header
        f.write("=" * 120 + "\n")
        f.write("CPA-STYLE TRANSACTION LEDGER\n")
        f.write("=" * 120 + "\n")
        f.write(f"Address: {address}\n")
        f.write(f"Period: {ledger_entries[0]['date']} to {ledger_entries[-1]['date']}\n")
        f.write(f"Total Transactions: {len(ledger_entries)}\n")
        f.write("=" * 120 + "\n\n")
        
        # Ledger entries
        f.write(f"{'Date':<12} {'Time':<10} {'Ref':<18} {'Type':<8} {'Debit':<8} {'Credit':<8} {'Balance':<10} {'Description':<40}\n")
        f.write("-" * 120 + "\n")
        
        for entry in ledger_entries:
            f.write(
                f"{entry['date']:<12} "
                f"{entry['time']:<10} "
                f"{entry['reference']:<18} "
                f"{entry['type']:<8} "
                f"{entry['debit']:<8} "
                f"{entry['credit']:<8} "
                f"{entry['balance']:<10} "
                f"{entry['description'][:40]:<40}\n"
            )
        
        f.write("\n" + "=" * 120 + "\n")
        f.write("SUMMARY STATISTICS\n")
        f.write("=" * 120 + "\n")
        f.write(f"Inscriptions Received: {stats['inscriptions_received']}\n")
        f.write(f"Inscriptions Sent: {stats['inscriptions_sent']}\n")
        f.write(f"Net Balance: {stats['inscriptions_received'] - stats['inscriptions_sent']}\n")
        f.write("\nTransactions by Type:\n")
        for tx_type, count in sorted(stats['by_type'].items()):
            f.write(f"  {tx_type}: {count}\n")
        
        f.write("\nTransactions by Month:\n")
        for month in sorted(stats['by_month'].keys()):
            month_stats = stats['by_month'][month]
            f.write(f"  {month}: Received={month_stats['received']}, Sent={month_stats['sent']}\n")
        
        f.write("\n" + "=" * 120 + "\n")
        f.write("DETAILED TRANSACTION LIST\n")
        f.write("=" * 120 + "\n\n")
        
        for i, entry in enumerate(ledger_entries, 1):
            f.write(f"Entry #{i}\n")
            f.write(f"  Date: {entry['date']} {entry['time']}\n")
            f.write(f"  Type: {entry['type']}\n")
            f.write(f"  Transaction ID: {entry['txid']}\n")
            if entry['inscription_id']:
                f.write(f"  Inscription ID: {entry['inscription_id']}\n")
            if entry['counterpart_address']:
                f.write(f"  Counterpart: {entry['counterpart_address']}\n")
            f.write(f"  Confirmed: {entry['confirmed']}\n")
            f.write(f"  Spent as Fee: {entry['spent_as_fee']}\n")
            f.write(f"  Description: {entry['description']}\n")
            f.write("\n")
    
    print(f"Saved formatted ledger to: {txt_path}")
    
    # Generate summary report
    summary_path = os.path.join(output_dir, f"{address}_accounting_summary.txt")
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write("ACCOUNTING SUMMARY REPORT\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"Account: Bitcoin Address\n")
        f.write(f"Address: {address}\n")
        f.write(f"Report Period: {ledger_entries[0]['date']} to {ledger_entries[-1]['date']}\n")
        f.write(f"Report Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n")
        
        f.write("ACCOUNT SUMMARY\n")
        f.write("-" * 80 + "\n")
        f.write(f"Opening Balance: 0\n")
        f.write(f"Total Debits (Received): {stats['inscriptions_received']}\n")
        f.write(f"Total Credits (Sent): {stats['inscriptions_sent']}\n")
        f.write(f"Closing Balance: {stats['inscriptions_received'] - stats['inscriptions_sent']}\n\n")
        
        f.write("TRANSACTION BREAKDOWN\n")
        f.write("-" * 80 + "\n")
        f.write(f"Total Transactions: {len(ledger_entries)}\n")
        f.write(f"  Receives: {stats['inscriptions_received']}\n")
        f.write(f"  Sends: {stats['inscriptions_sent']}\n")
        f.write(f"  Confirmed: {sum(1 for e in ledger_entries if e['confirmed'] == 'Yes')}\n")
        f.write(f"  Pending: {sum(1 for e in ledger_entries if e['confirmed'] == 'No')}\n\n")
        
        f.write("MONTHLY ACTIVITY\n")
        f.write("-" * 80 + "\n")
        for month in sorted(stats['by_month'].keys()):
            month_stats = stats['by_month'][month]
            f.write(f"{month}: {month_stats['received']} received, {month_stats['sent']} sent\n")
    
    print(f"Saved accounting summary to: {summary_path}")
    
    return csv_path, txt_path, summary_path


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generate CPA-style ledger from Ordiscan transaction data"
    )
    parser.add_argument(
        '--address',
        required=True,
        help="Bitcoin address"
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
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    print(f"Generating ledger for address: {args.address}")
    generate_ledger(raw_json_path, args.output_dir, args.address)
    print("\n✓ Ledger generation complete!")


if __name__ == "__main__":
    main()

