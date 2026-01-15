#!/usr/bin/env python3
"""
Scrape country data from scrapethissite.com and create visualization.
"""

import ssl
import urllib.request
import urllib.error
import csv
import re
import matplotlib.pyplot as plt
from typing import List, Dict

# Try to import certifi for better SSL certificate handling
try:
    import certifi
    USE_CERTIFI = True
except ImportError:
    USE_CERTIFI = False


def parse_countries_with_regex(html_content: str) -> List[Dict]:
    """
    Parse country data from HTML using regex.
    More reliable for this structured HTML than html.parser.
    """
    countries = []
    
    # Pattern to match each country div block
    # Matches: <div class="col-md-4 country"> ... </div>
    country_pattern = r'<div class="col-md-4 country">(.*?)</div>\s*<!--\.col-->'
    
    # Find all country blocks
    country_blocks = re.findall(country_pattern, html_content, re.DOTALL)
    
    for block in country_blocks:
        country = {}
        
        # Extract country name from <h3 class="country-name">...</h3>
        # The name comes after the <i> flag icon tag
        name_match = re.search(r'<h3 class="country-name">.*?<i[^>]*></i>\s*([^<]+)</h3>', block, re.DOTALL)
        if name_match:
            country['name'] = name_match.group(1).strip()
        
        # Extract capital from <span class="country-capital">...</span>
        capital_match = re.search(r'<span class="country-capital">([^<]+)</span>', block)
        if capital_match:
            country['capital'] = capital_match.group(1).strip()
        
        # Extract population from <span class="country-population">...</span>
        pop_match = re.search(r'<span class="country-population">([^<]+)</span>', block)
        if pop_match:
            try:
                pop_str = pop_match.group(1).strip().replace(',', '')
                country['population'] = int(pop_str)
            except ValueError:
                continue
        
        # Extract area from <span class="country-area">...</span>
        area_match = re.search(r'<span class="country-area">([^<]+)</span>', block)
        if area_match:
            try:
                area_str = area_match.group(1).strip().replace(',', '')
                country['area_km2'] = float(area_str)
            except ValueError:
                continue
        
        # Only add if all fields are present
        if all(key in country for key in ['name', 'capital', 'population', 'area_km2']):
            countries.append(country)
    
    return countries


def scrape_countries(url: str) -> List[Dict]:
    """
    Scrape country data from the given URL.
    
    Args:
        url: URL to scrape
        
    Returns:
        List of dictionaries with country data
        
    Raises:
        urllib.error.URLError: If network request fails
        ValueError: If parsing fails
    """
    try:
        # Create SSL context (use certifi if available, otherwise default)
        if USE_CERTIFI:
            ctx = ssl.create_default_context(cafile=certifi.where())
        else:
            ctx = ssl.create_default_context()
        
        # Create request with User-Agent header
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        
        # Fetch the webpage
        print(f"Fetching data from {url}...")
        with urllib.request.urlopen(req, context=ctx, timeout=20) as response:
            html_content = response.read().decode('utf-8', errors='replace')
        
        # Parse HTML using regex
        print("Parsing HTML...")
        countries = parse_countries_with_regex(html_content)
        
        print(f"Found {len(countries)} countries")
        return countries
        
    except urllib.error.URLError as e:
        raise urllib.error.URLError(f"Network error: {e}")
    except Exception as e:
        raise ValueError(f"Parsing error: {e}")


def write_csv(countries: List[Dict], filename: str) -> int:
    """
    Write country data to CSV file.
    
    Args:
        countries: List of country dictionaries
        filename: Output CSV filename
        
    Returns:
        Number of rows written
    """
    if not countries:
        print("No countries to write to CSV")
        return 0
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['name', 'capital', 'population', 'area_km2']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for country in countries:
            writer.writerow(country)
    
    return len(countries)


def create_visualization(csv_filename: str, output_image: str):
    """
    Create a bar chart of top 10 countries by population.
    
    Args:
        csv_filename: Input CSV file
        output_image: Output image filename
    """
    # Read CSV
    countries = []
    with open(csv_filename, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            countries.append({
                'name': row['name'],
                'population': int(row['population'])
            })
    
    # Sort by population and get top 10
    countries.sort(key=lambda x: x['population'], reverse=True)
    top10 = countries[:10]
    
    # Create bar chart
    names = [c['name'] for c in top10]
    populations = [c['population'] for c in top10]
    
    plt.figure(figsize=(12, 6))
    plt.barh(names, populations, color='steelblue')
    plt.xlabel('Population', fontsize=12)
    plt.ylabel('Country', fontsize=12)
    plt.title('Top 10 Countries by Population', fontsize=14, fontweight='bold')
    plt.gca().invert_yaxis()  # Highest population at top
    plt.tight_layout()
    
    # Save figure
    plt.savefig(output_image, dpi=150, bbox_inches='tight')
    print(f"Visualization saved to {output_image}")


def main():
    """Main function to orchestrate scraping, CSV writing, and visualization."""
    url = "https://www.scrapethissite.com/pages/simple/"
    csv_filename = "countries.csv"
    image_filename = "top10_population.png"
    
    try:
        # Scrape countries
        countries = scrape_countries(url)
        
        if not countries:
            print("No countries found. Exiting.")
            return
        
        # Write to CSV
        rows_written = write_csv(countries, csv_filename)
        print(f"Successfully saved {rows_written} rows to {csv_filename}")
        
        # Create visualization
        create_visualization(csv_filename, image_filename)
        
    except urllib.error.URLError as e:
        print(f"Error: {e}")
        print("Please check your internet connection and try again.")
    except ValueError as e:
        print(f"Error: {e}")
        print("There was a problem parsing the HTML.")
    except Exception as e:
        print(f"Unexpected error: {e}")


if __name__ == "__main__":
    main()


# ============================================================================
# HOW TO RUN:
# ============================================================================
# 1. Make sure your virtual environment is activated:
#    source venv/bin/activate
#
# 2. Run the script:
#    python scrape_countries.py
#
# 3. The script will:
#    - Scrape country data from the website
#    - Save data to countries.csv
#    - Generate top10_population.png visualization
#
# Note: Make sure matplotlib is installed in your venv:
#    pip install matplotlib
# ============================================================================

