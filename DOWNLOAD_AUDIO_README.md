# Download Codecademy Audio - Instructions

I've created three scripts to help you download and transcribe the audio from the private Codecademy link.

## Quick Start (Easiest Method)

### Method 1: Get Direct Audio URL (Recommended)

1. **Open the recording page** in your browser (while logged into Codecademy)
2. **Open Developer Tools**: Press `F12` or `Cmd+Option+I` (Mac)
3. **Go to the Network tab**
4. **Start playing the audio**
5. **Look for a media request** (filter by "Media" or look for `.mp3`, `.m4a`, `.wav` files)
6. **Right-click the request** → Copy → Copy URL
7. **Run the download script**:
   ```bash
   python3 download_codecademy_audio.py "PASTE_THE_DIRECT_AUDIO_URL_HERE"
   ```
8. **Transcribe the audio**:
   ```bash
   whisper recording.mp3
   ```

### Method 2: Use Browser Automation (Selenium)

1. **Install dependencies**:
   ```bash
   pip3 install selenium webdriver-manager
   ```

2. **Run the browser automation script**:
   ```bash
   python3 download_with_browser.py
   ```

3. **Follow the prompts**:
   - Browser will open
   - Log in to Codecademy
   - Navigate to the recording
   - Start playing audio
   - Press ENTER when ready
   - Script will download the audio automatically

### Method 3: Manual Download

1. **Open the recording page** in your browser
2. **Right-click the audio player** → "Save audio as..." or "Download"
3. **Save the file** to this directory
4. **Transcribe it**:
   ```bash
   whisper your_audio_file.mp3
   ```

## Scripts Created

- `download_codecademy_audio.py` - Main download script (tries multiple methods)
- `download_with_browser.py` - Browser automation with Selenium
- `extract_browser_cookies.py` - Helper for cookie extraction

## After Downloading

Once you have the audio file, transcribe it with:

```bash
whisper recording.mp3
```

Or specify options:

```bash
whisper recording.mp3 --model base --language en --output_format txt
```

The transcription will be saved as `recording.txt` (or other format you specify).

