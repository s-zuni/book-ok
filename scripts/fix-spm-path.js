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
