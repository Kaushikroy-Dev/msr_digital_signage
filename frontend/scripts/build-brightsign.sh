#!/bin/bash

# Build script for BrightSign HTML5 Player
# This script creates an optimized HTML5 player package for BrightSign devices

set -e

echo "🔨 Building BrightSign HTML5 Player..."

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FRONTEND_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
DIST_DIR="$FRONTEND_DIR/dist"
BRIGHTSIGN_DIST_DIR="$DIST_DIR/brightsign"
BRIGHTSIGN_CONFIG_DIR="$FRONTEND_DIR/brightsign"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$BRIGHTSIGN_DIST_DIR"
mkdir -p "$BRIGHTSIGN_DIST_DIR"

# Copy BrightSign player files
echo "📋 Copying BrightSign player files..."
cp "$BRIGHTSIGN_CONFIG_DIR/player.html" "$BRIGHTSIGN_DIST_DIR/index.html"
cp "$BRIGHTSIGN_CONFIG_DIR/bsconfig.json" "$BRIGHTSIGN_DIST_DIR/" 2>/dev/null || true

# Update API endpoint in player.html if .env exists
if [ -f "$FRONTEND_DIR/.env.production.brightsign" ]; then
    echo "📝 Updating API endpoints from .env.production.brightsign..."
    source "$FRONTEND_DIR/.env.production.brightsign"
    
    if [ ! -z "$VITE_API_URL" ]; then
        sed -i.bak "s|http://localhost:3000/api|$VITE_API_URL|g" "$BRIGHTSIGN_DIST_DIR/index.html"
        rm -f "$BRIGHTSIGN_DIST_DIR/index.html.bak"
    fi
    
    if [ ! -z "$VITE_WS_URL" ]; then
        sed -i.bak "s|ws://localhost:3000/ws|$VITE_WS_URL|g" "$BRIGHTSIGN_DIST_DIR/index.html"
        rm -f "$BRIGHTSIGN_DIST_DIR/index.html.bak"
    fi
fi

# Create README for deployment
cat > "$BRIGHTSIGN_DIST_DIR/README.txt" << EOF
BrightSign Digital Signage Player
=================================

Deployment Instructions:
1. Copy all files in this directory to your BrightSign device
2. Set index.html as the startup file in BrightSign Presentation Manager
3. Configure network settings in bsconfig.json
4. Ensure device can reach the API server

Files:
- index.html: Main player application
- bsconfig.json: Device configuration
- README.txt: This file

For more information, see docs/BRIGHTSIGN_SETUP.md
EOF

# Create deployment package (zip)
echo "📦 Creating deployment package..."
cd "$BRIGHTSIGN_DIST_DIR"
zip -r player.zip . -x "*.zip" "README.txt" || {
    echo "⚠️  zip command not found. Install zip utility to create package."
    echo "   Files ready at: $BRIGHTSIGN_DIST_DIR"
    exit 0
}

echo "✅ BrightSign Player built successfully!"
echo "   Output directory: $BRIGHTSIGN_DIST_DIR"
echo "   Package: $BRIGHTSIGN_DIST_DIR/player.zip"
echo ""
echo "📋 Next steps:"
echo "   1. Copy files to BrightSign device via USB/SD card or network"
echo "   2. Configure BrightSign device to launch index.html"
echo "   3. See docs/BRIGHTSIGN_SETUP.md for detailed instructions"
