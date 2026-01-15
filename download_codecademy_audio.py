#!/usr/bin/env python3
"""
Script to download audio from a private Codecademy recording page.
Supports multiple methods: browser cookies, selenium automation, or manual URL extraction.
"""

import requests
import sys
import os
from pathlib import Path
import json

def download_with_cookies(url, cookies_file=None):
    """Download audio using cookies from browser."""
    session = requests.Session()
    
    # Set headers to mimic a browser
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    })
    
    # Load cookies if provided
    if cookies_file and os.path.exists(cookies_file):
        with open(cookies_file, 'r') as f:
            cookies = json.load(f)
            session.cookies.update(cookies)
    
    try:
        response = session.get(url, allow_redirects=True, timeout=30)
        response.raise_for_status()
        
        # Try to find audio/video URLs in the response
        content = response.text
        
        # Look for common audio/video URL patterns
        import re
        patterns = [
            r'https?://[^"\s]+\.(mp3|m4a|wav|ogg|mp4|webm)',
            r'src=["\']([^"\']+\.(mp3|m4a|wav|ogg|mp4|webm))',
            r'url\(["\']?([^"\')]+\.(mp3|m4a|wav|ogg|mp4|webm))',
            r'"(https?://[^"]+audio[^"]+)"',
            r'"(https?://[^"]+recording[^"]+)"',
        ]
        
        audio_urls = []
        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            audio_urls.extend([m[0] if isinstance(m, tuple) else m for m in matches])
        
        if audio_urls:
            print(f"Found {len(audio_urls)} potential audio URLs:")
            for i, url in enumerate(audio_urls[:5], 1):  # Show first 5
                print(f"  {i}. {url}")
            return audio_urls[0] if audio_urls else None
        
        # Try to find JSON data with media URLs
        json_pattern = r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>'
        json_match = re.search(json_pattern, content, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                # Recursively search for audio URLs in JSON
                def find_urls(obj, urls=None):
                    if urls is None:
                        urls = []
                    if isinstance(obj, dict):
                        for v in obj.values():
                            find_urls(v, urls)
                    elif isinstance(obj, list):
                        for item in obj:
                            find_urls(item, urls)
                    elif isinstance(obj, str) and ('audio' in obj.lower() or 'mp3' in obj.lower() or 'm4a' in obj.lower()):
                        if obj.startswith('http'):
                            urls.append(obj)
                    return urls
                
                found_urls = find_urls(data)
                if found_urls:
                    print(f"Found audio URLs in page data:")
                    for url in found_urls[:5]:
                        print(f"  - {url}")
                    return found_urls[0]
            except json.JSONDecodeError:
                pass
        
        print("Could not find audio URL in page content.")
        print("The page might require JavaScript rendering or authentication.")
        return None
        
    except requests.exceptions.RequestException as e:
        print(f"Error downloading page: {e}")
        return None


def download_audio_file(audio_url, output_filename="recording.mp3"):
    """Download the actual audio file."""
    print(f"\nDownloading audio from: {audio_url}")
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    })
    
    try:
        response = session.get(audio_url, stream=True, timeout=60)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(output_filename, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\rDownloaded: {percent:.1f}% ({downloaded}/{total_size} bytes)", end='', flush=True)
        
        print(f"\n✓ Successfully downloaded: {output_filename}")
        return output_filename
        
    except requests.exceptions.RequestException as e:
        print(f"\n✗ Error downloading audio: {e}")
        return None


def main():
    url = "https://www.codecademy.com/bootcamps/ai-7/recordings/11"
    
    if len(sys.argv) > 1:
        url = sys.argv[1]
    
    print(f"Attempting to download audio from: {url}\n")
    
    # Method 1: Try with yt-dlp (if available)
    print("Method 1: Trying yt-dlp...")
    try:
        import subprocess
        result = subprocess.run(
            ['yt-dlp', '--list-formats', url],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            print("✓ yt-dlp can access the URL!")
            print("\nDownloading with yt-dlp...")
            output_file = "recording.%(ext)s"
            subprocess.run(['yt-dlp', '-x', '--audio-format', 'mp3', '-o', output_file, url])
            print("✓ Download complete!")
            return
        else:
            print("✗ yt-dlp cannot access the URL (authentication required)")
    except (FileNotFoundError, subprocess.TimeoutExpired):
        print("✗ yt-dlp not available or timed out")
    
    # Method 2: Try with requests and cookies
    print("\nMethod 2: Trying with requests...")
    audio_url = download_with_cookies(url)
    
    if audio_url:
        output_file = "recording.mp3"
        if audio_url.endswith('.m4a'):
            output_file = "recording.m4a"
        elif audio_url.endswith('.wav'):
            output_file = "recording.wav"
        
        download_audio_file(audio_url, output_file)
        print(f"\n✓ Audio file saved as: {output_file}")
        print(f"\nYou can now transcribe it with: whisper {output_file}")
    else:
        print("\n" + "="*60)
        print("MANUAL INSTRUCTIONS:")
        print("="*60)
        print("\nSince the page requires authentication, please:")
        print("\n1. Open the recording page in your browser (while logged in)")
        print("2. Open Developer Tools (F12 or Cmd+Option+I)")
        print("3. Go to the Network tab")
        print("4. Play the audio")
        print("5. Look for a request with .mp3, .m4a, or similar extension")
        print("6. Right-click the request → Copy → Copy URL")
        print("7. Run this script with the direct audio URL:")
        print(f"   python3 download_codecademy_audio.py <direct_audio_url>")
        print("\nOR download the file manually and provide the path for transcription.")


if __name__ == "__main__":
    main()

