"""
Ordiscan API Client

This module provides a client for interacting with the Ordiscan API.
All endpoint paths are configurable via constants at the top of this file.

To find the correct endpoint paths, check: https://ordiscan.com/docs/api
"""

import time
import urllib.request
import urllib.error
import urllib.parse
import json
import ssl

# ============================================================================
# CONFIGURATION: Adjust these based on Ordiscan API documentation
# ============================================================================
# Base URL for Ordiscan API
ORDISCAN_BASE_URL = "https://api.ordiscan.com"

# Endpoint path for address activity/transactions
# Common patterns: "/v1/address/{address}/activity" or "/v1/address/{address}/transactions"
# Replace {address} with the actual Bitcoin address when making requests
ADDRESS_ACTIVITY_ENDPOINT = "/v1/address/{address}/activity"

# Endpoint for transaction details (to get BTC amounts)
# Common patterns: "/v1/tx/{txid}" or "/v1/transaction/{txid}"
TRANSACTION_DETAILS_ENDPOINT = "/v1/tx/{txid}"

# Alternative endpoint if the above doesn't work:
# ADDRESS_ACTIVITY_ENDPOINT = "/v1/address/{address}/transactions"
# TRANSACTION_DETAILS_ENDPOINT = "/v1/transaction/{txid}"
# ============================================================================


class OrdiscanClient:
    """Client for interacting with the Ordiscan API."""
    
    def __init__(self, api_key):
        """
        Initialize the Ordiscan client.
        
        Args:
            api_key: Your Ordiscan API key
        """
        self.api_key = api_key
        self.base_url = ORDISCAN_BASE_URL
        # Create SSL context with system certificates (maintains SSL verification)
        # On macOS, Python may not find certificates automatically, so we load them explicitly
        import os
        self.ssl_context = ssl.create_default_context()
        
        # Try loading system certificate locations common on macOS/Linux
        system_cert_paths = [
            '/etc/ssl/cert.pem',  # macOS/Linux common location
            '/usr/local/etc/openssl/cert.pem',  # Homebrew OpenSSL
        ]
        for cert_path in system_cert_paths:
            if os.path.exists(cert_path):
                try:
                    self.ssl_context.load_verify_locations(cert_path)
                    break
                except Exception:
                    pass  # Try next path
    
    def _make_request(self, url, max_retries=5):
        """
        Make an HTTP request with retry logic for rate limits.
        
        Args:
            url: Full URL to request
            max_retries: Maximum number of retry attempts
            
        Returns:
            dict: Parsed JSON response
            
        Raises:
            PermissionError: For 401/403 errors
            Exception: For other HTTP errors or network issues
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        
        retry_count = 0
        while retry_count < max_retries:
            try:
                request = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(request, context=self.ssl_context) as response:
                    status = response.getcode()
                    
                    if status == 200:
                        return json.loads(response.read().decode('utf-8'))
                    elif status == 429:
                        # Rate limit - exponential backoff
                        retry_after = int(response.headers.get('Retry-After', 2 ** retry_count))
                        wait_time = min(retry_after, 60)  # Cap at 60 seconds
                        print(f"Rate limited (429). Waiting {wait_time} seconds before retry {retry_count + 1}/{max_retries}...")
                        time.sleep(wait_time)
                        retry_count += 1
                    elif status == 401:
                        raise PermissionError("Authentication failed (401). Check your API key.")
                    elif status == 403:
                        raise PermissionError("Access forbidden (403). Your API key may not have permission for this endpoint.")
                    else:
                        raise Exception(f"Unexpected HTTP status {status}: {response.read().decode('utf-8')}")
                        
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    retry_after = int(e.headers.get('Retry-After', 2 ** retry_count))
                    wait_time = min(retry_after, 60)
                    print(f"Rate limited (429). Waiting {wait_time} seconds before retry {retry_count + 1}/{max_retries}...")
                    time.sleep(wait_time)
                    retry_count += 1
                elif e.code == 401:
                    raise PermissionError("Authentication failed (401). Check your API key.")
                elif e.code == 403:
                    raise PermissionError("Access forbidden (403). Your API key may not have permission for this endpoint.")
                else:
                    raise Exception(f"HTTP error {e.code}: {e.reason}")
            except urllib.error.URLError as e:
                raise Exception(f"Network error: {e.reason}")
        
        raise Exception(f"Max retries ({max_retries}) exceeded due to rate limiting.")
    
    def fetch_transaction_details(self, txid):
        """
        Fetch detailed transaction information including BTC amounts.
        
        Args:
            txid: Transaction ID
            
        Returns:
            dict: Transaction details with BTC amounts, or None if not found
        """
        endpoint = TRANSACTION_DETAILS_ENDPOINT.format(txid=txid)
        url = f"{self.base_url}{endpoint}"
        
        try:
            return self._make_request(url)
        except Exception as e:
            # If transaction details endpoint doesn't exist or fails, return None
            # This allows the code to continue without BTC amounts
            return None
    
    def fetch_address_activity(self, address):
        """
        Fetch all activity/transactions for a Bitcoin address with pagination.
        
        Args:
            address: Bitcoin address (e.g., bc1...)
            
        Returns:
            list: All transactions/activity items
        """
        endpoint = ADDRESS_ACTIVITY_ENDPOINT.format(address=address)
        all_items = []
        page = 1
        
        print(f"Fetching activity for address: {address}")
        
        while True:
            # Build URL with pagination
            # Common pagination patterns: ?page=N or ?offset=N&limit=M
            # Adjust based on Ordiscan API docs
            url = f"{self.base_url}{endpoint}?page={page}"
            
            try:
                print(f"  Fetching page {page}...", end=" ", flush=True)
                data = self._make_request(url)
                
                # Handle different response structures
                # Common patterns: data.data, data.results, data.items, or just data
                items = None
                if isinstance(data, dict):
                    items = data.get('data', data.get('results', data.get('items', [])))
                    # Check if there's a pagination indicator
                    has_more = data.get('has_more', data.get('next', None) is not None)
                elif isinstance(data, list):
                    items = data
                    has_more = len(items) > 0
                else:
                    raise Exception(f"Unexpected response format: {type(data)}")
                
                if not items or len(items) == 0:
                    print("done (no more data)")
                    break
                
                all_items.extend(items)
                print(f"done ({len(items)} items)")
                
                # Check if we should continue paginating
                # If response doesn't indicate more pages, stop after empty page
                if not has_more:
                    break
                
                page += 1
                
            except Exception as e:
                # If it's a permission error or other critical error, re-raise
                if isinstance(e, PermissionError):
                    raise
                # For other errors on first page, raise immediately
                if page == 1:
                    raise Exception(f"Failed to fetch first page: {e}")
                # For later pages, log and stop
                print(f"\n  Warning: Error on page {page}: {e}")
                print(f"  Stopping pagination. Collected {len(all_items)} items so far.")
                break
        
        print(f"Total items fetched: {len(all_items)}")
        return all_items

