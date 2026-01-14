#!/bin/bash

# Script to update Chrome extension with Railway URL
# Usage: ./UPDATE_EXTENSION_URL.sh your-railway-url.up.railway.app

if [ -z "$1" ]; then
  echo "❌ Error: Please provide your Railway URL"
  echo ""
  echo "Usage: ./UPDATE_EXTENSION_URL.sh your-railway-url.up.railway.app"
  echo ""
  echo "Example:"
  echo "  ./UPDATE_EXTENSION_URL.sh dealstackr-web-production-abc123.up.railway.app"
  exit 1
fi

RAILWAY_URL="$1"

echo "🔧 Updating Chrome extension to use Railway URL..."
echo "   Railway URL: https://$RAILWAY_URL"
echo ""

# Navigate to extension directory
cd "$(dirname "$0")/offers-chrome-extension" || exit 1

# Backup original file
cp dashboard.js dashboard.js.backup
echo "✅ Created backup: dashboard.js.backup"

# Update localhost references to Railway URL
sed -i '' "s|http://localhost:3000|https://$RAILWAY_URL|g" dashboard.js
sed -i '' "s|https://localhost:3000|https://$RAILWAY_URL|g" dashboard.js

echo "✅ Updated dashboard.js with Railway URL"
echo ""
echo "📋 Next steps:"
echo "   1. Go to chrome://extensions/"
echo "   2. Click reload button on DealStackr extension"
echo "   3. Test sync button in extension dashboard"
echo ""
echo "✨ Done! Your extension now syncs with Railway."
