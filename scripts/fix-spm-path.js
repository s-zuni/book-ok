const fs = require('fs');
const path = require('path');

const packageSwiftPath = path.join(__dirname, '../ios/App/CapApp-SPM/Package.swift');
if (fs.existsSync(packageSwiftPath)) {
    console.log('Fixing package path slashes in Package.swift for macOS compile safety...');
    let content = fs.readFileSync(packageSwiftPath, 'utf8');
    if (content.includes('\\')) {
        content = content.replace(/path:\s*"([^"]+)"/g, (match, p1) => {
            return `path: "${p1.replace(/\\/g, '/')}"`;
        });
        fs.writeFileSync(packageSwiftPath, content, 'utf8');
        console.log('Package.swift path separators fixed successfully!');
    }
}

// Dynamically patch SPM Package.swift to include CapacitorGoogleAuth which lacks automated Package.swift export support in older versions
if (fs.existsSync(packageSwiftPath)) {
    let content = fs.readFileSync(packageSwiftPath, 'utf8');
    if (!content.includes('CapacitorGoogleAuth')) {
        console.log('Injecting CapacitorGoogleAuth to SPM Package.swift...');
        
        // Add dependency
        content = content.replace(
            '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.3.3"),',
            '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.3.3"),\n        .package(url: "https://github.com/CodetrixStudio/CapacitorGoogleAuth.git", .upToNextMajor(from: "3.4.0-rc.4")),'
        );
        
        // Add target dependency
        content = content.replace(
            '.product(name: "Capacitor", package: "capacitor-swift-pm"),',
            '.product(name: "Capacitor", package: "capacitor-swift-pm"),\n                .product(name: "CapacitorGoogleAuth", package: "CapacitorGoogleAuth"),'
        );
        
        fs.writeFileSync(packageSwiftPath, content, 'utf8');
        console.log('CapacitorGoogleAuth dependency injected successfully!');
    }
}
