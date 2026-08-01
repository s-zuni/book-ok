#!/bin/sh

# Fail the build if any command fails
set -e

# Export environment variables for Homebrew
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

# Move to the project root directory
cd ../../..

echo "Installing project dependencies..."
npm ci

echo "Running Capacitor app build pipeline..."
npm run build:app

echo "Resolving Xcode Swift Package dependencies in-place..."
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj

echo "Xcode Cloud post-clone setup completed successfully!"
