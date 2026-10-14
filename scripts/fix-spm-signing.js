const fs = require('fs');
const path = require('path');

const pbxprojPath = path.resolve(__dirname, '../ios/App/App.xcodeproj/project.pbxproj');

if (!fs.existsSync(pbxprojPath)) {
    console.error(`❌ File not found: ${pbxprojPath}`);
    process.exit(1);
}

let content = fs.readFileSync(pbxprojPath, 'utf8');

// 1. Find PBXProject configuration list
const projectConfigListRegex = /([0-9A-F]{24})\s*\/\*\s*Build configuration list for PBXProject "App"\s*\*\/\s*=\s*\{[\s\S]*?buildConfigurations\s*=\s*\(([\s\S]*?)\);/m;
const projectMatch = content.match(projectConfigListRegex);

const projectConfigIds = [];
if (projectMatch && projectMatch[2]) {
    const idRegex = /([0-9A-F]{24})/g;
    let m;
    while ((m = idRegex.exec(projectMatch[2])) !== null) {
        projectConfigIds.push(m[1]);
    }
}

// Fallback IDs if not found
if (projectConfigIds.length === 0) {
    projectConfigIds.push('504EC3141FED79650016851F', '504EC3151FED79650016851F');
}

console.log(`🔍 Found PBXProject configuration IDs: ${projectConfigIds.join(', ')}`);

let modified = false;

for (const configId of projectConfigIds) {
    // Regex to match the XCBuildConfiguration block for this configId
    const blockRegex = new RegExp(`(${configId}\\s*\\/\\*.*?\\*\\/\\s*=\\s*\\{[\\s\\S]*?buildSettings\\s*=\\s*\\{)([\\s\\S]*?)(\\};[\\s\\S]*?\\};)`, 'm');
    const blockMatch = content.match(blockRegex);

    if (blockMatch) {
        let prefix = blockMatch[1];
        let settings = blockMatch[2];
        let suffix = blockMatch[3];

        // 1. Remove manual provisioning profile from Project level
        settings = settings.replace(/\s*PROVISIONING_PROFILE(\[[^\]]+\])?\s*=\s*[^;]+;/g, '');
        settings = settings.replace(/\s*PROVISIONING_PROFILE_SPECIFIER(\[[^\]]+\])?\s*=\s*[^;]+;/g, '');

        // 2. Set CODE_SIGN_STYLE = Automatic at Project level (so SPM dependencies default to Automatic)
        if (/CODE_SIGN_STYLE\s*=\s*[^;]+;/.test(settings)) {
            settings = settings.replace(/CODE_SIGN_STYLE\s*=\s*[^;]+;/g, 'CODE_SIGN_STYLE = Automatic;');
        }

        // 3. Set CODE_SIGN_IDENTITY = "Apple Development" at Project level
        // (This satisfies Xcode requirement that automatically signed SPM targets use Apple Development)
        // Also remove any sdk-specific CODE_SIGN_IDENTITY overrides at project level
        settings = settings.replace(/\s*CODE_SIGN_IDENTITY\[sdk=[^\]]+\]\s*=\s*[^;]+;/g, '');
        if (/CODE_SIGN_IDENTITY\s*=\s*[^;]+;/.test(settings)) {
            settings = settings.replace(/CODE_SIGN_IDENTITY\s*=\s*[^;]+;/g, 'CODE_SIGN_IDENTITY = "Apple Development";');
        } else {
            settings = `\n\t\t\t\tCODE_SIGN_IDENTITY = "Apple Development";${settings}`;
        }

        const newBlock = prefix + settings + suffix;
        content = content.replace(blockMatch[0], newBlock);
        modified = true;
        console.log(`✅ Reset PBXProject configuration ${configId} to Apple Development / Automatic.`);
    } else {
        console.warn(`⚠️ Could not find block for configuration ID ${configId}`);
    }
}

if (modified) {
    fs.writeFileSync(pbxprojPath, content, 'utf8');
    console.log('🎉 Successfully fixed SPM signing conflict in project.pbxproj!');
} else {
    console.log('ℹ️ No modifications were needed.');
}

