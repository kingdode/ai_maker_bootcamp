#!/usr/bin/env python3
"""
HTML Tax Ledger Visualizer Generator

Generates a professional HTML file to view the tax ledger with BTC amounts and gains/losses.
"""

import os
import sys
import csv
import json
from datetime import datetime, timezone

# Ensure we can import from the same directory
_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)


def generate_tax_ledger_html(tax_ledger_csv_path, raw_json_path, output_dir, address):
    """
    Generate an HTML file to view the tax ledger.
    """
    # Load ledger data
    ledger_entries = []
    with open(tax_ledger_csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ledger_entries.append(row)
    
    # Load raw JSON for additional details
    with open(raw_json_path, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)
    
    # Calculate statistics
    total_received = sum(1 for e in ledger_entries if e['Type'] == 'RECEIVE')
    total_sent = sum(1 for e in ledger_entries if e['Type'] == 'SEND')
    confirmed_count = sum(1 for e in ledger_entries if e['Confirmed'] == 'Yes')
    
    # Calculate BTC totals
    total_btc_received = sum(float(e.get('Debit BTC', 0.0)) for e in ledger_entries if e['Type'] == 'RECEIVE')
    total_btc_sent = sum(float(e.get('Credit BTC', 0.0)) for e in ledger_entries if e['Type'] == 'SEND')
    total_fees = sum(float(e.get('Fee BTC', 0.0)) for e in ledger_entries)
    total_gains = sum(float(e.get('Gain/Loss BTC', 0.0)) for e in ledger_entries if float(e.get('Gain/Loss BTC', 0.0)) > 0)
    total_losses = sum(abs(float(e.get('Gain/Loss BTC', 0.0))) for e in ledger_entries if float(e.get('Gain/Loss BTC', 0.0)) < 0)
    net_gain_loss = total_gains - total_losses
    
    # Get date range
    dates = [e['Date'] for e in ledger_entries]
    date_range = f"{min(dates)} to {max(dates)}" if dates else "N/A"
    
    # Generate HTML
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tax Ledger - {address[:20]}...</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }}
        
        .container {{
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 2em;
            margin-bottom: 10px;
        }}
        
        .header .address {{
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            opacity: 0.9;
            word-break: break-all;
        }}
        
        .summary-cards {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }}
        
        .card {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }}
        
        .card .label {{
            font-size: 0.9em;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        
        .card .value {{
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }}
        
        .card.receive .value {{
            color: #28a745;
        }}
        
        .card.send .value {{
            color: #dc3545;
        }}
        
        .card.gain .value {{
            color: #28a745;
        }}
        
        .card.loss .value {{
            color: #dc3545;
        }}
        
        .controls {{
            padding: 20px 30px;
            background: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: center;
        }}
        
        .controls label {{
            font-weight: 600;
            color: #495057;
        }}
        
        .controls select, .controls input {{
            padding: 8px 12px;
            border: 2px solid #dee2e6;
            border-radius: 5px;
            font-size: 0.9em;
        }}
        
        .controls select:focus, .controls input:focus {{
            outline: none;
            border-color: #667eea;
        }}
        
        .table-container {{
            overflow-x: auto;
            padding: 30px;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9em;
        }}
        
        thead {{
            background: #667eea;
            color: white;
        }}
        
        th {{
            padding: 15px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 0.85em;
            position: sticky;
            top: 0;
            z-index: 10;
        }}
        
        tbody tr {{
            border-bottom: 1px solid #dee2e6;
            transition: background-color 0.2s;
        }}
        
        tbody tr:hover {{
            background-color: #f8f9fa;
        }}
        
        tbody tr.receive {{
            border-left: 4px solid #28a745;
        }}
        
        tbody tr.send {{
            border-left: 4px solid #dc3545;
        }}
        
        td {{
            padding: 12px 15px;
            color: #495057;
        }}
        
        .type-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
        }}
        
        .type-badge.receive {{
            background: #d4edda;
            color: #155724;
        }}
        
        .type-badge.send {{
            background: #f8d7da;
            color: #721c24;
        }}
        
        .debit {{
            color: #28a745;
            font-weight: 600;
        }}
        
        .credit {{
            color: #dc3545;
            font-weight: 600;
        }}
        
        .gain {{
            color: #28a745;
            font-weight: 600;
        }}
        
        .loss {{
            color: #dc3545;
            font-weight: 600;
        }}
        
        .balance {{
            font-weight: 600;
            color: #667eea;
        }}
        
        .txid-link {{
            color: #667eea;
            text-decoration: none;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
        }}
        
        .txid-link:hover {{
            text-decoration: underline;
        }}
        
        .inscription-id {{
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            color: #6c757d;
        }}
        
        .confirmed-badge {{
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 600;
        }}
        
        .confirmed-badge.yes {{
            background: #d4edda;
            color: #155724;
        }}
        
        .confirmed-badge.no {{
            background: #fff3cd;
            color: #856404;
        }}
        
        .footer {{
            padding: 20px 30px;
            background: #f8f9fa;
            text-align: center;
            color: #6c757d;
            font-size: 0.9em;
        }}
        
        .no-results {{
            padding: 40px;
            text-align: center;
            color: #6c757d;
            font-size: 1.1em;
        }}
        
        .btc-amount {{
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }}
        
        @media print {{
            body {{
                background: white;
                padding: 0;
            }}
            
            .container {{
                box-shadow: none;
            }}
            
            .controls {{
                display: none;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💰 Tax Ledger - Gains & Losses</h1>
            <div class="address">{address}</div>
            <div style="margin-top: 15px; font-size: 0.9em; opacity: 0.9;">
                Period: {date_range} | Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
            </div>
        </div>
        
        <div class="summary-cards">
            <div class="card">
                <div class="label">Total Transactions</div>
                <div class="value">{len(ledger_entries)}</div>
            </div>
            <div class="card receive">
                <div class="label">Purchases</div>
                <div class="value">{total_received}</div>
                <div style="font-size: 0.7em; color: #666; margin-top: 5px;">{total_btc_received:.8f} BTC</div>
            </div>
            <div class="card send">
                <div class="label">Sales</div>
                <div class="value">{total_sent}</div>
                <div style="font-size: 0.7em; color: #666; margin-top: 5px;">{total_btc_sent:.8f} BTC</div>
            </div>
            <div class="card">
                <div class="label">Total Fees</div>
                <div class="value">{total_fees:.8f}</div>
                <div style="font-size: 0.7em; color: #666; margin-top: 5px;">BTC</div>
            </div>
            <div class="card gain">
                <div class="label">Total Gains</div>
                <div class="value">{total_gains:.8f}</div>
                <div style="font-size: 0.7em; color: #666; margin-top: 5px;">BTC</div>
            </div>
            <div class="card loss">
                <div class="label">Total Losses</div>
                <div class="value">{total_losses:.8f}</div>
                <div style="font-size: 0.7em; color: #666; margin-top: 5px;">BTC</div>
            </div>
            <div class="card" style="border: 2px solid {'#28a745' if net_gain_loss >= 0 else '#dc3545'};">
                <div class="label">Net Gain/Loss</div>
                <div class="value" style="color: {'#28a745' if net_gain_loss >= 0 else '#dc3545'};">
                    {net_gain_loss:+.8f}
                </div>
                <div style="font-size: 0.7em; color: #666; margin-top: 5px;">BTC</div>
            </div>
        </div>
        
        <div class="controls">
            <label for="typeFilter">Filter by Type:</label>
            <select id="typeFilter">
                <option value="all">All Types</option>
                <option value="RECEIVE">Purchases Only</option>
                <option value="SEND">Sales Only</option>
            </select>
            
            <label for="dateFilter">Filter by Date:</label>
            <input type="date" id="dateFilterStart" placeholder="Start Date">
            <input type="date" id="dateFilterEnd" placeholder="End Date">
            
            <label for="searchBox">Search:</label>
            <input type="text" id="searchBox" placeholder="Search transaction ID, inscription ID...">
            
            <button onclick="resetFilters()" style="padding: 8px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Reset Filters
            </button>
        </div>
        
        <div class="table-container">
            <table id="ledgerTable">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Debit BTC</th>
                        <th>Credit BTC</th>
                        <th>Fee BTC</th>
                        <th>Balance BTC</th>
                        <th>Cost Basis</th>
                        <th>Gain/Loss BTC</th>
                        <th>Transaction ID</th>
                        <th>Inscription ID</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="ledgerBody">
"""
    
    # Add table rows
    for entry in ledger_entries:
        row_class = entry['Type'].lower()
        type_badge_class = entry['Type'].lower()
        debit_btc = float(entry.get('Debit BTC', 0.0))
        credit_btc = float(entry.get('Credit BTC', 0.0))
        fee_btc = float(entry.get('Fee BTC', 0.0))
        gain_loss = float(entry.get('Gain/Loss BTC', 0.0))
        cost_basis = float(entry.get('Cost Basis', 0.0))
        
        debit_class = 'debit' if debit_btc > 0 else ''
        credit_class = 'credit' if credit_btc > 0 else ''
        gain_loss_class = 'gain' if gain_loss > 0 else ('loss' if gain_loss < 0 else '')
        confirmed_class = entry['Confirmed'].lower()
        
        txid_short = entry['Transaction ID'][:16] + '...' if len(entry['Transaction ID']) > 16 else entry['Transaction ID']
        inscription_short = entry['Inscription ID'][:20] + '...' if len(entry['Inscription ID']) > 20 else entry['Inscription ID']
        
        html_content += f"""
                    <tr class="{row_class}" data-type="{entry['Type']}" data-date="{entry['Date']}" data-txid="{entry['Transaction ID']}" data-inscription="{entry['Inscription ID']}">
                        <td>{entry['Date']}</td>
                        <td>{entry['Time']}</td>
                        <td><span class="type-badge {type_badge_class}">{entry['Type']}</span></td>
                        <td class="{debit_class} btc-amount">{debit_btc:.8f}</td>
                        <td class="{credit_class} btc-amount">{credit_btc:.8f}</td>
                        <td class="btc-amount">{fee_btc:.8f}</td>
                        <td class="balance btc-amount">{entry.get('Balance BTC', '0.00000000')}</td>
                        <td class="btc-amount">{cost_basis:.8f}</td>
                        <td class="{gain_loss_class} btc-amount">{gain_loss:+.8f}</td>
                        <td><a href="https://ordiscan.com/tx/{entry['Transaction ID']}" target="_blank" class="txid-link" title="{entry['Transaction ID']}">{txid_short}</a></td>
                        <td class="inscription-id" title="{entry['Inscription ID']}">{inscription_short}</td>
                        <td><span class="confirmed-badge {confirmed_class}">{entry['Confirmed']}</span></td>
                    </tr>
"""
    
    html_content += """
                </tbody>
            </table>
            <div id="noResults" class="no-results" style="display: none;">
                No transactions match your filters.
            </div>
        </div>
        
        <div class="footer">
            <p>This tax ledger was generated from Ordiscan API data</p>
            <p>For accounting and tax reporting purposes - FIFO Cost Basis Method</p>
        </div>
    </div>
    
    <script>
        // Filter functionality
        const typeFilter = document.getElementById('typeFilter');
        const dateFilterStart = document.getElementById('dateFilterStart');
        const dateFilterEnd = document.getElementById('dateFilterEnd');
        const searchBox = document.getElementById('searchBox');
        const ledgerBody = document.getElementById('ledgerBody');
        const noResults = document.getElementById('noResults');
        const rows = Array.from(ledgerBody.querySelectorAll('tr'));
        
        function filterTable() {
            const typeValue = typeFilter.value;
            const dateStart = dateFilterStart.value;
            const dateEnd = dateFilterEnd.value;
            const searchValue = searchBox.value.toLowerCase();
            
            let visibleCount = 0;
            
            rows.forEach(row => {
                const rowType = row.dataset.type;
                const rowDate = row.dataset.date;
                const rowTxid = row.dataset.txid.toLowerCase();
                const rowInscription = row.dataset.inscription.toLowerCase();
                
                let visible = true;
                
                // Type filter
                if (typeValue !== 'all' && rowType !== typeValue) {
                    visible = false;
                }
                
                // Date filter
                if (dateStart && rowDate < dateStart) {
                    visible = false;
                }
                if (dateEnd && rowDate > dateEnd) {
                    visible = false;
                }
                
                // Search filter
                if (searchValue && !rowTxid.includes(searchValue) && !rowInscription.includes(searchValue)) {
                    visible = false;
                }
                
                if (visible) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });
            
            // Show/hide no results message
            if (visibleCount === 0) {
                noResults.style.display = 'block';
                ledgerBody.style.display = 'none';
            } else {
                noResults.style.display = 'none';
                ledgerBody.style.display = '';
            }
        }
        
        function resetFilters() {
            typeFilter.value = 'all';
            dateFilterStart.value = '';
            dateFilterEnd.value = '';
            searchBox.value = '';
            filterTable();
        }
        
        // Add event listeners
        typeFilter.addEventListener('change', filterTable);
        dateFilterStart.addEventListener('change', filterTable);
        dateFilterEnd.addEventListener('change', filterTable);
        searchBox.addEventListener('input', filterTable);
        
        // Sort table on header click
        document.querySelectorAll('th').forEach((th, index) => {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => {
                const tbody = ledgerBody;
                const rows = Array.from(tbody.querySelectorAll('tr:not([style*="display: none"])'));
                
                const isAscending = th.dataset.sort === 'asc';
                th.dataset.sort = isAscending ? 'desc' : 'asc';
                
                rows.sort((a, b) => {
                    const aText = a.cells[index].textContent.trim();
                    const bText = b.cells[index].textContent.trim();
                    
                    // Try numeric comparison
                    const aNum = parseFloat(aText);
                    const bNum = parseFloat(bText);
                    
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        return isAscending ? bNum - aNum : aNum - bNum;
                    }
                    
                    // String comparison
                    return isAscending 
                        ? bText.localeCompare(aText)
                        : aText.localeCompare(bText);
                });
                
                rows.forEach(row => tbody.appendChild(row));
            });
        });
    </script>
</body>
</html>
"""
    
    # Save HTML file
    html_path = os.path.join(output_dir, f"{address}_tax_ledger.html")
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"Saved HTML tax ledger viewer to: {html_path}")
    return html_path


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generate HTML viewer for tax ledger"
    )
    parser.add_argument(
        '--address',
        required=True,
        help="Bitcoin address"
    )
    parser.add_argument(
        '--input-dir',
        default='output',
        help="Directory containing ledger files (default: output)"
    )
    parser.add_argument(
        '--output-dir',
        default='output',
        help="Output directory (default: output)"
    )
    
    args = parser.parse_args()
    
    tax_ledger_csv_path = os.path.join(args.input_dir, f"{args.address}_tax_ledger.csv")
    raw_json_path = os.path.join(args.input_dir, f"{args.address}_raw.json")
    
    if not os.path.exists(tax_ledger_csv_path):
        print(f"Error: Tax ledger CSV file not found: {tax_ledger_csv_path}")
        print("Please run generate_tax_ledger.py first to generate the tax ledger.")
        sys.exit(1)
    
    if not os.path.exists(raw_json_path):
        print(f"Error: Raw JSON file not found: {raw_json_path}")
        sys.exit(1)
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    print(f"Generating HTML tax ledger viewer for address: {args.address}")
    html_path = generate_tax_ledger_html(tax_ledger_csv_path, raw_json_path, args.output_dir, args.address)
    print(f"\n✓ HTML tax ledger viewer generated!")
    print(f"\nOpen the file in your browser:")
    print(f"  file://{os.path.abspath(html_path)}")
    print(f"\nOr run:")
    print(f"  open {html_path}")
    
    return html_path


if __name__ == "__main__":
    main()

