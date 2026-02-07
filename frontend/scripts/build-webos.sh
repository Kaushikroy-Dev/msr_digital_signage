#!/bin/bash

# Build script for WebOS App
# This script builds the React app and packages it as a WebOS app (.ipk)

set -e

echo "🔨 Building WebOS App..."

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FRONTEND_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
DIST_DIR="$FRONTEND_DIR/dist"
WEBOS_DIST_DIR="$DIST_DIR/webos"
WEBOS_CONFIG_DIR="$FRONTEND_DIR/webos"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$WEBOS_DIST_DIR"
mkdir -p "$WEBOS_DIST_DIR"

# Build React app for production
echo "📦 Building React app..."
cd "$FRONTEND_DIR"
npm run build

# Copy WebOS config files to dist
echo "📋 Copying WebOS configuration..."
cp "$WEBOS_CONFIG_DIR/appinfo.json" "$DIST_DIR/"
cp "$WEBOS_CONFIG_DIR/services.json" "$DIST_DIR/" 2>/dev/null || true

# Create WebOS app structure
echo "📱 Creating WebOS app structure..."
cd "$DIST_DIR"

# Create appinfo.json if it doesn't exist
if [ ! -f "appinfo.json" ]; then
    echo "⚠️  appinfo.json not found, creating default..."
    cat > appinfo.json << EOF
{
    "id": "com.digitalsignage.player",
    "version": "1.0.0",
    "type": "web",
    "main": "index.html",
    "title": "Digital Signage Player"
}
EOF
fi

# Check if webOS CLI is available
if ! command -v ares-package &> /dev/null; then
    echo "⚠️  webOS CLI (ares-package) not found. Please install webOS CLI."
    echo "   Visit: https://www.webosose.org/docs/tools/sdk/cli/installing-cli/"
    echo ""
    echo "📦 Build output ready at: $DIST_DIR"
    echo "   To package as .ipk, run:"
    echo "   cd $DIST_DIR"
    echo "   ares-package ."
    exit 0
fi

# Package as .ipk
echo "📱 Packaging WebOS App..."
ares-package . || {
    echo "⚠️  Packaging failed. Make sure you have:"
    echo "   1. webOS CLI installed"
    echo "   2. Proper appinfo.json configuration"
    echo ""
    echo "📦 Build output ready at: $DIST_DIR"
    echo "   You can manually package it later using: ares-package ."
    exit 0
}

# Move .ipk file to webos directory
if [ -f "*.ipk" ]; then
    mv *.ipk "$WEBOS_DIST_DIR/digital-signage.ipk"
    echo "✅ WebOS App built successfully!"
    echo "   Output: $WEBOS_DIST_DIR/digital-signage.ipk"
else
    echo "⚠️  .ipk file not found, but build completed"
    echo "   Build output: $DIST_DIR"
fi
