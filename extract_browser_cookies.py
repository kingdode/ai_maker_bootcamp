#!/usr/bin/env python3
"""
Helper script to extract cookies from your browser for Codecademy.
This allows the download script to authenticate as you.
"""

import json
import sys
import os
from pathlib import Path

def get_chrome_cookies():
    """Instructions for extracting Chrome cookies."""
    print("="*60)
    print("CHROME COOKIE EXTRACTION:")
    print("="*60)
    print("\nOption A - Using Browser Extension (Easiest):")
    print("1. Install 'Cookie-Editor' extension for Chrome")
    print("2. Go to codecademy.com and log in")
    print("3. Click the Cookie-Editor icon")
    print("4. Click 'Export' → 'JSON'")
    print("5. Save as 'cookies.json' in this directory")
    
    print("\nOption B - Manual Cookie Extraction:")
    print("1. Go to codecademy.com and log in")
    print("2. Open Developer Tools (F12)")
    print("3. Go to Application tab → Cookies → https://www.codecademy.com")
    print("4. Copy the cookie values manually")
    
    print("\n" + "="*60)
    print("SAFARI COOKIE EXTRACTION:")
    print("="*60)
    print("1. Enable Develop menu: Safari → Preferences → Advanced → Show Develop menu")
    print("2. Go to codecademy.com and log in")
    print("3. Develop → Show Web Inspector")
    print("4. Storage tab → Cookies → codecademy.com")
    
    print("\n" + "="*60)
    print("FIREFOX COOKIE EXTRACTION:")
    print("="*60)
    print("1. Install 'Cookie Quick Manager' extension")
    print("2. Go to codecademy.com and log in")
    print("3. Export cookies as JSON")


def create_cookie_template():
    """Create a template JSON file for cookies."""
    template = {
        "session_id": "your_session_id_here",
        "_codecademy_session": "your_session_cookie_here",
        "remember_token": "your_remember_token_here"
    }
    
    template_file = "cookies_template.json"
    with open(template_file, 'w') as f:
        json.dump(template, f, indent=2)
    
    print(f"\nCreated template: {template_file}")
    print("Edit this file with your actual cookie values from the browser.")


if __name__ == "__main__":
    get_chrome_cookies()
    create_cookie_template()

