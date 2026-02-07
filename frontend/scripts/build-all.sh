#!/bin/bash

# Unified build script for all platforms
# Builds all platform variants of the Digital Signage Player

set -e

echo "🚀 Building Digital Signage Player for All Platforms"
echo "=================================================="

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FRONTEND_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
DIST_DIR="$FRONTEND_DIR/dist"

# Clean previous builds
echo ""
echo "🧹 Cleaning previous builds..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Build base React app first
echo ""
echo "📦 Building base React application..."
cd "$FRONTEND_DIR"
npm run build

# Build Tizen
echo ""
echo "📱 Building Tizen (Samsung Smart TV)..."
if bash "$SCRIPT_DIR/build-tizen.sh"; then
    echo "✅ Tizen build completed"
else
    echo "⚠️  Tizen build failed (Tizen CLI may not be installed)"
fi

# Build WebOS
echo ""
echo "📱 Building WebOS (LG Smart TV)..."
if bash "$SCRIPT_DIR/build-webos.sh"; then
    echo "✅ WebOS build completed"
else
    echo "⚠️  WebOS build failed (webOS CLI may not be installed)"
fi

# Build BrightSign
echo ""
echo "📱 Building BrightSign Player..."
if bash "$SCRIPT_DIR/build-brightsign.sh"; then
    echo "✅ BrightSign build completed"
else
    echo "⚠️  BrightSign build failed"
fi

# Build Electron (Windows/Linux)
echo ""
echo "💻 Building Electron (Windows/Linux)..."
if command -v electron-builder &> /dev/null; then
    cd "$FRONTEND_DIR"
    if npm run build:electron:win 2>&1 | tail -10; then
        echo "✅ Electron Windows build completed"
    else
        echo "⚠️  Electron Windows build failed"
    fi
    
    if npm run build:electron:linux 2>&1 | tail -10; then
        echo "✅ Electron Linux build completed"
    else
        echo "⚠️  Electron Linux build failed"
    fi
else
    echo "⚠️  Electron builder not found. Install electron-builder to build native apps."
fi

# Build Android
echo ""
echo "📱 Building Android..."
if command -v npx &> /dev/null; then
    cd "$FRONTEND_DIR"
    if [ -d "android" ]; then
        if npm run build:android:apk 2>&1 | tail -10; then
            echo "✅ Android build completed"
        else
            echo "⚠️  Android build failed (Android SDK may not be configured)"
        fi
    else
        echo "⚠️  Android project not initialized. Run 'npm run capacitor:add:android' first."
    fi
else
    echo "⚠️  npx not found. Install Node.js to build Android app."
fi

# Summary
echo ""
echo "=================================================="
echo "📊 Build Summary"
echo "=================================================="
echo ""
echo "Build outputs:"
echo "  📁 $DIST_DIR"
echo ""

if [ -d "$DIST_DIR/tizen" ]; then
    echo "  ✅ Tizen: $DIST_DIR/tizen/"
fi

if [ -d "$DIST_DIR/webos" ]; then
    echo "  ✅ WebOS: $DIST_DIR/webos/"
fi

if [ -d "$DIST_DIR/brightsign" ]; then
    echo "  ✅ BrightSign: $DIST_DIR/brightsign/"
fi

if [ -d "$DIST_DIR/electron" ]; then
    echo "  ✅ Electron: $DIST_DIR/electron/"
fi

if [ -d "$FRONTEND_DIR/android/app/build/outputs/apk" ]; then
    echo "  ✅ Android: $FRONTEND_DIR/android/app/build/outputs/apk/"
fi

echo ""
echo "🎉 Build process completed!"
echo ""
echo "Next steps:"
echo "  - Deploy platform-specific builds to devices"
echo "  - See docs/ for platform-specific deployment guides"
echo ""
