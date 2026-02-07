#!/bin/bash

# Build script for Tizen Web App
# This script builds the React app and packages it as a Tizen Web App (.wgt)

set -e

echo "🔨 Building Tizen Web App..."

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FRONTEND_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
DIST_DIR="$FRONTEND_DIR/dist"
TIZEN_DIST_DIR="$DIST_DIR/tizen"
TIZEN_CONFIG_DIR="$FRONTEND_DIR/tizen"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$TIZEN_DIST_DIR"
mkdir -p "$TIZEN_DIST_DIR"

# Build React app for production
echo "📦 Building React app..."
cd "$FRONTEND_DIR"
npm run build

# Copy Tizen config files to dist
echo "📋 Copying Tizen configuration..."
cp "$TIZEN_CONFIG_DIR/config.xml" "$DIST_DIR/"
cp "$TIZEN_CONFIG_DIR/.tizenignore" "$DIST_DIR/" 2>/dev/null || true

# Check if Tizen CLI is available
if ! command -v tizen &> /dev/null; then
    echo "⚠️  Tizen CLI not found. Please install Tizen Studio."
    echo "   Visit: https://developer.tizen.org/development/tizen-studio"
    echo ""
    echo "📦 Build output ready at: $DIST_DIR"
    echo "   To package as .wgt, run:"
    echo "   cd $DIST_DIR"
    echo "   tizen package -t wgt -s <certificate-profile-name>"
    exit 0
fi

# Package as .wgt
echo "📱 Packaging Tizen Web App..."
cd "$DIST_DIR"

# Check for certificate profile
CERT_PROFILE="${TIZEN_CERT_PROFILE:-default}"
echo "   Using certificate profile: $CERT_PROFILE"

# Package the app
tizen package -t wgt -s "$CERT_PROFILE" || {
    echo "⚠️  Packaging failed. Make sure you have:"
    echo "   1. Tizen Studio installed"
    echo "   2. A certificate profile configured"
    echo "   3. Run: tizen security-profiles add --name default --filename author.p12 --password <password>"
    echo ""
    echo "📦 Build output ready at: $DIST_DIR"
    echo "   You can manually package it later using Tizen Studio"
    exit 0
}

# Move .wgt file to tizen directory
if [ -f "*.wgt" ]; then
    mv *.wgt "$TIZEN_DIST_DIR/digital-signage.wgt"
    echo "✅ Tizen Web App built successfully!"
    echo "   Output: $TIZEN_DIST_DIR/digital-signage.wgt"
else
    echo "⚠️  .wgt file not found, but build completed"
    echo "   Build output: $DIST_DIR"
fi
