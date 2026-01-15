import pandas as pd
import glob
import os

# Find all CSV files starting with 'amzn' (case-insensitive)
csv_files = glob.glob('AMZN*.csv') + glob.glob('amzn*.csv')

# Remove duplicates and sort
csv_files = sorted(list(set(csv_files)))

print(f"Found {len(csv_files)} CSV files:")
for file in csv_files:
    print(f"  - {file}")

# Read and combine all CSV files
dataframes = []
for file in csv_files:
    print(f"\nReading {file}...")
    df = pd.read_csv(file)
    print(f"  Rows: {len(df)}")
    dataframes.append(df)

# Combine all dataframes
combined_df = pd.concat(dataframes, ignore_index=True)

# Remove duplicates based on 'date' column if they exist
initial_rows = len(combined_df)
combined_df = combined_df.drop_duplicates(subset=['date'], keep='first')
final_rows = len(combined_df)

if initial_rows != final_rows:
    print(f"\nRemoved {initial_rows - final_rows} duplicate rows based on date")

# Sort by date (handle different date formats and timezones)
combined_df['date'] = pd.to_datetime(combined_df['date'], format='mixed', errors='coerce', utc=True)
# Convert all to timezone-naive datetime for consistent sorting
if combined_df['date'].dt.tz is not None:
    combined_df['date'] = combined_df['date'].dt.tz_convert(None)
combined_df = combined_df.sort_values('date').reset_index(drop=True)

# Save to combined CSV file
output_file = 'AMZN_combined.csv'
combined_df.to_csv(output_file, index=False)

print(f"\n✓ Successfully combined {len(csv_files)} files into {output_file}")
print(f"  Total rows: {len(combined_df)}")
print(f"  Date range: {combined_df['date'].min()} to {combined_df['date'].max()}")

