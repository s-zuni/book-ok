const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '../app/api');

// Helper to recursively find all route.ts/route.js files
function getRouteFiles(dir, files_ = []) {
    if (!fs.existsSync(dir)) return files_;
    const files = fs.readdirSync(dir);
    for (const i in files) {
        const name = path.join(dir, files[i]);
        if (fs.statSync(name).isDirectory()) {
            getRouteFiles(name, files_);
        } else if (name.endsWith('route.ts') || name.endsWith('route.js')) {
            files_.push(name);
        }
    }
    return files_;
}

let renamedFiles = [];

try {
    if (fs.existsSync(apiDir)) {
        const routeFiles = getRouteFiles(apiDir);
        console.log(`Temporarily renaming ${routeFiles.length} route files for static export...`);
        for (const file of routeFiles) {
            const newPath = file + '.bak';
            fs.renameSync(file, newPath);
            renamedFiles.push({ original: file, temp: newPath });
        }
    }

    // Clean .next cache to prevent stale type validator references
    const nextDir = path.join(__dirname, '../.next');
    if (fs.existsSync(nextDir)) {
        console.log('Cleaning .next cache...');
        fs.rmSync(nextDir, { recursive: true, force: true });
    }

    console.log('Running next build for Capacitor...');
    execSync('npx cross-env NEXT_DISABLE_TURBOPACK=1 BUILD_TARGET=capacitor next build', { stdio: 'inherit' });
    console.log('Next build completed successfully!');

} catch (error) {
    console.error('Build failed:', error);
    process.exitCode = 1;
} finally {
    if (renamedFiles.length > 0) {
        console.log(`Restoring ${renamedFiles.length} route files...`);
        for (const entry of renamedFiles) {
            if (fs.existsSync(entry.temp)) {
                fs.renameSync(entry.temp, entry.original);
            }
        }
    }
}
