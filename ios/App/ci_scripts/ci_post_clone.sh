#!/bin/sh

# Fail the build if any command fails
set -e

# Export environment variables for Homebrew
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

echo "Installing Node.js via Homebrew..."
brew install node

echo "Verifying Node.js and npm versions..."
node -v
npm -v

# Move to the project root directory (ci_post_clone.sh runs inside ios/App/ci_scripts)
cd ../../..

echo "Installing project dependencies..."
npm ci

echo "Running Capacitor app build pipeline..."
npm run build:app

# Xcode Cloud는 패키지 자동 해석이 꺼져 있어 Package.resolved가 오래되면 빌드가 실패한다.
# 플러그인(@capgo/capacitor-social-login 등)이 추가한 SPM 의존성을 여기서 명시적으로 해석해 갱신한다.
echo "Resolving Swift Package dependencies..."
# Xcode Cloud가 켜 둔 "resolved 파일만 사용/자동 해석 금지" 설정을 해제한다 (이후 빌드 단계에도 적용될 수 있음).
defaults write com.apple.dt.Xcode IDEPackageOnlyUseVersionsFromResolvedFile -bool NO
defaults write com.apple.dt.Xcode IDEDisableAutomaticPackageResolution -bool NO

cd ios/App
xcodebuild -resolvePackageDependencies -project App.xcodeproj -scheme App
cd ../..

echo "Xcode Cloud post-clone setup completed successfully!"
