#!/bin/sh

# Fail the build if any command fails
set -e

# Export environment variables for Homebrew
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

# Move to the project root directory
cd ../../..

echo "Installing Node.js via Homebrew..."
brew install node@20
brew link node@20

echo "Installing project dependencies..."
npm ci

echo "Running Capacitor app build pipeline..."
npm run build:app

echo "Xcode Cloud post-clone setup completed successfully!"
