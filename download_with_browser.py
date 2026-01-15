#!/usr/bin/env python3
"""
Browser automation script to download audio from Codecademy.
This will open a browser window - you'll need to log in manually.
"""

import sys
import time
import os

def check_selenium():
    """Check if selenium is installed."""
    try:
        from selenium import webdriver
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        return True
    except ImportError:
        return False

def download_with_selenium(url):
    """Use Selenium to automate browser and download audio."""
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.service import Service
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        import requests
        
        print("Opening browser...")
        print("Please log in to Codecademy when the browser opens.")
        print("The script will wait for you to navigate to the recording page.\n")
        
        # Setup Chrome options
        chrome_options = Options()
        # Uncomment the next line to run in headless mode (no browser window)
        # chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        
        # Create driver
        driver = webdriver.Chrome(options=chrome_options)
        
        try:
            # Navigate to the URL
            driver.get(url)
            
            print("\n" + "="*60)
            print("INSTRUCTIONS:")
            print("="*60)
            print("1. Log in to Codecademy if prompted")
            print("2. Navigate to the recording page if needed")
            print("3. Start playing the audio")
            print("4. Press ENTER here when the audio is playing...")
            input()
            
            # Get page source and look for audio URLs
            page_source = driver.page_source
            
            import re
            # Look for audio/video elements
            audio_elements = driver.find_elements(By.TAG_NAME, "audio")
            video_elements = driver.find_elements(By.TAG_NAME, "video")
            
            audio_urls = []
            
            # Check audio elements
            for audio in audio_elements:
                src = audio.get_attribute('src')
                if src:
                    audio_urls.append(src)
            
            # Check video elements
            for video in video_elements:
                src = video.get_attribute('src')
                if src:
                    audio_urls.append(src)
            
            # Also search in page source
            patterns = [
                r'src=["\']([^"\']+\.(mp3|m4a|wav|ogg|mp4|webm))',
                r'https?://[^"\s<>]+\.(mp3|m4a|wav|ogg|mp4|webm)',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, page_source, re.IGNORECASE)
                for match in matches:
                    url = match[0] if isinstance(match, tuple) else match
                    if url.startswith('http'):
                        audio_urls.append(url)
            
            # Remove duplicates
            audio_urls = list(set(audio_urls))
            
            if audio_urls:
                print(f"\nFound {len(audio_urls)} audio URL(s):")
                for i, audio_url in enumerate(audio_urls, 1):
                    print(f"  {i}. {audio_url}")
                
                # Download the first one
                audio_url = audio_urls[0]
                print(f"\nDownloading: {audio_url}")
                
                # Get cookies from browser
                cookies = driver.get_cookies()
                session = requests.Session()
                for cookie in cookies:
                    session.cookies.set(cookie['name'], cookie['value'])
                
                # Download the file
                response = session.get(audio_url, stream=True)
                response.raise_for_status()
                
                # Determine file extension
                ext = 'mp3'
                if '.m4a' in audio_url:
                    ext = 'm4a'
                elif '.wav' in audio_url:
                    ext = 'wav'
                
                output_file = f"recording.{ext}"
                
                with open(output_file, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                
                print(f"✓ Downloaded: {output_file}")
                print(f"\nYou can now transcribe it with: whisper {output_file}")
                return output_file
            else:
                print("\n✗ Could not find audio URL automatically.")
                print("Please check the browser's Network tab for the audio file URL.")
                print("Press ENTER to close the browser...")
                input()
                
        finally:
            driver.quit()
            
    except Exception as e:
        print(f"Error: {e}")
        return None

def main():
    url = "https://www.codecademy.com/bootcamps/ai-7/recordings/11"
    
    if len(sys.argv) > 1:
        url = sys.argv[1]
    
    if not check_selenium():
        print("Selenium is not installed.")
        print("Installing selenium and webdriver-manager...")
        os.system("pip3 install selenium webdriver-manager")
        print("\nPlease run the script again.")
        return
    
    download_with_selenium(url)

if __name__ == "__main__":
    main()

