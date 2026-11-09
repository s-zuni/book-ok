const fs = require('fs');
const path = require('path');

const pbxprojPath = path.resolve(__dirname, '../ios/App/App.xcodeproj/project.pbxproj');

if (!fs.existsSync(pbxprojPath)) {
    console.error(`❌ File not found: ${pbxprojPath}`);
    process.exit(1);
}

let content = fs.readFileSync(pbxprojPath, 'utf8');

// 1. PBXProject configuration list 찾기
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
if (projectConfigIds.length === 0) {
    projectConfigIds.push('504EC3141FED79650016851F', '504EC3151FED79650016851F');
}

// 2. PBXNativeTarget "App" configuration list 찾기
const targetConfigListRegex = /([0-9A-F]{24})\s*\/\*\s*Build configuration list for PBXNativeTarget "App"\s*\*\/\s*=\s*\{[\s\S]*?buildConfigurations\s*=\s*\(([\s\S]*?)\);/m;
const targetMatch = content.match(targetConfigListRegex);

const targetConfigIds = [];
if (targetMatch && targetMatch[2]) {
    const idRegex = /([0-9A-F]{24})/g;
    let m;
    while ((m = idRegex.exec(targetMatch[2])) !== null) {
        targetConfigIds.push(m[1]);
    }
}
if (targetConfigIds.length === 0) {
    targetConfigIds.push('504EC3171FED79650016851F', '504EC3181FED79650016851F');
}

let modified = false;

// Step A: PBXProject 레벨 - SPM 패키지 서명 충돌 방지를 위해 Automatic / Apple Development 로 리셋
for (const configId of projectConfigIds) {
    const blockRegex = new RegExp(`(${configId}\\s*\\/\\*.*?\\*\\/\\s*=\\s*\\{[\\s\\S]*?buildSettings\\s*=\\s*\\{)([\\s\\S]*?)(\\};[\\s\\S]*?\\};)`, 'm');
    const blockMatch = content.match(blockRegex);

    if (blockMatch) {
        let prefix = blockMatch[1];
        let settings = blockMatch[2];
        let suffix = blockMatch[3];

        // 수동 프로비저닝 프로파일 제거
        settings = settings.replace(/\s*PROVISIONING_PROFILE(\[[^\]]+\])?\s*=\s*[^;]+;/g, '');
        settings = settings.replace(/\s*PROVISIONING_PROFILE_SPECIFIER(\[[^\]]+\])?\s*=\s*[^;]+;/g, '');

        // CODE_SIGN_STYLE = Automatic
        if (/CODE_SIGN_STYLE\s*=\s*[^;]+;/.test(settings)) {
            settings = settings.replace(/CODE_SIGN_STYLE\s*=\s*[^;]+;/g, 'CODE_SIGN_STYLE = Automatic;');
        }

        // CODE_SIGN_IDENTITY = "Apple Development"
        settings = settings.replace(/\s*CODE_SIGN_IDENTITY\[sdk=[^\]]+\]\s*=\s*[^;]+;/g, '');
        if (/CODE_SIGN_IDENTITY\s*=\s*[^;]+;/.test(settings)) {
            settings = settings.replace(/CODE_SIGN_IDENTITY\s*=\s*[^;]+;/g, 'CODE_SIGN_IDENTITY = "Apple Development";');
        } else {
            settings = `\n\t\t\t\tCODE_SIGN_IDENTITY = "Apple Development";${settings}`;
        }

        const newBlock = prefix + settings + suffix;
        content = content.replace(blockMatch[0], newBlock);
        modified = true;
        console.log(`✅ PBXProject 설정 (${configId}) -> Automatic / Apple Development 리셋`);
    }
}

// Step B: PBXNativeTarget "App" Release 설정 - 배포용 수동 서명 및 프로파일 적용 (Entitlements 누락 방지)
const profileName = process.env.PROFILE_NAME || process.env.PROVISIONING_PROFILE_SPECIFIER || '';
const profileUuid = process.env.PROFILE_UUID || process.env.PROVISIONING_PROFILE || '';
const teamId = process.env.DEVELOPMENT_TEAM || '7AB2D79572';

// Target Release ID (보통 504EC3181FED79650016851F)
const targetReleaseConfigId = targetConfigIds[1] || '504EC3181FED79650016851F';
const targetBlockRegex = new RegExp(`(${targetReleaseConfigId}\\s*\\/\\*\\s*Release\\s*\\*\\/\\s*=\\s*\\{[\\s\\S]*?buildSettings\\s*=\\s*\\{)([\\s\\S]*?)(\\};[\\s\\S]*?\\};)`, 'm');
const targetBlockMatch = content.match(targetBlockRegex);

if (targetBlockMatch) {
    let prefix = targetBlockMatch[1];
    let settings = targetBlockMatch[2];
    let suffix = targetBlockMatch[3];

    // DEVELOPMENT_TEAM
    if (/DEVELOPMENT_TEAM\s*=\s*[^;]+;/.test(settings)) {
        settings = settings.replace(/DEVELOPMENT_TEAM\s*=\s*[^;]+;/g, `DEVELOPMENT_TEAM = ${teamId};`);
    } else {
        settings = `\n\t\t\t\tDEVELOPMENT_TEAM = ${teamId};${settings}`;
    }

    // CODE_SIGN_STYLE = Manual
    if (/CODE_SIGN_STYLE\s*=\s*[^;]+;/.test(settings)) {
        settings = settings.replace(/CODE_SIGN_STYLE\s*=\s*[^;]+;/g, 'CODE_SIGN_STYLE = Manual;');
    } else {
        settings = `\n\t\t\t\tCODE_SIGN_STYLE = Manual;${settings}`;
    }

    // CODE_SIGN_IDENTITY = "Apple Distribution"
    settings = settings.replace(/\s*CODE_SIGN_IDENTITY\[sdk=[^\]]+\]\s*=\s*[^;]+;/g, '');
    if (/CODE_SIGN_IDENTITY\s*=\s*[^;]+;/.test(settings)) {
        settings = settings.replace(/CODE_SIGN_IDENTITY\s*=\s*[^;]+;/g, 'CODE_SIGN_IDENTITY = "Apple Distribution";');
    } else {
        settings = `\n\t\t\t\tCODE_SIGN_IDENTITY = "Apple Distribution";${settings}`;
    }
    settings = `\n\t\t\t\t"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "Apple Distribution";${settings}`;

    // PROVISIONING_PROFILE_SPECIFIER / PROVISIONING_PROFILE
    if (profileName) {
        settings = settings.replace(/\s*PROVISIONING_PROFILE_SPECIFIER\s*=\s*[^;]+;/g, '');
        settings = `\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "${profileName}";${settings}`;
    }
    if (profileUuid) {
        settings = settings.replace(/\s*PROVISIONING_PROFILE\s*=\s*[^;]+;/g, '');
        settings = `\n\t\t\t\tPROVISIONING_PROFILE = "${profileUuid}";${settings}`;
    }

    // CODE_SIGN_ENTITLEMENTS = App/App.entitlements
    if (!settings.includes('CODE_SIGN_ENTITLEMENTS')) {
        settings = `\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;${settings}`;
    }

    const newBlock = prefix + settings + suffix;
    content = content.replace(targetBlockMatch[0], newBlock);
    modified = true;
    console.log(`✅ PBXNativeTarget "App" Release (${targetReleaseConfigId}) -> Manual / Apple Distribution / Profile: ${profileName || profileUuid || '(기존)'}`);
}

// Step C: NonescapableTypes 플래그 주입 (Capacitor 8 Swift API 컴파일 지원)
const configBlockRegex = /([0-9A-F]{24}\s*\/\*\s*(?:Debug|Release)\s*\*\/[\s\S]*?buildSettings\s*=\s*\{)([\s\S]*?)(\};)/g;
content = content.replace(configBlockRegex, (match, header, settings, footer) => {
    let updatedSettings = settings;
    if (updatedSettings.includes('OTHER_SWIFT_FLAGS')) {
        if (!updatedSettings.includes('NonescapableTypes')) {
            updatedSettings = updatedSettings.replace(
                /OTHER_SWIFT_FLAGS\s*=\s*"([^"]*)";/,
                'OTHER_SWIFT_FLAGS = "$1 -enable-experimental-feature NonescapableTypes";'
            );
            modified = true;
        }
    } else {
        updatedSettings = `\n\t\t\t\tOTHER_SWIFT_FLAGS = "$(inherited) -enable-experimental-feature NonescapableTypes";${updatedSettings}`;
        modified = true;
    }
    return header + updatedSettings + footer;
});

if (modified) {
    fs.writeFileSync(pbxprojPath, content, 'utf8');
    console.log('🎉 project.pbxproj 업데이트 완료!');
}

// Step D: ExportOptions.plist 자동 생성
const exportOptionsPath = process.env.EXPORT_OPTIONS_PATH || '/tmp/export_options.plist';
const exportProfileValue = profileName || profileUuid || 'bookok ios_app_store';

const exportOptionsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store</string>
	<key>teamID</key>
	<string>${teamId}</string>
	<key>signingStyle</key>
	<string>manual</string>
	<key>signingCertificate</key>
	<string>Apple Distribution</string>
	<key>provisioningProfiles</key>
	<dict>
		<key>com.bookok.kr</key>
		<string>${exportProfileValue}</string>
	</dict>
	<key>destination</key>
	<string>export</string>
	<key>manageAppVersionAndBuildNumber</key>
	<false/>
</dict>
</plist>
`;

try {
    fs.writeFileSync(exportOptionsPath, exportOptionsContent, 'utf8');
    console.log(`✅ ExportOptions.plist 생성 완료: ${exportOptionsPath}`);
} catch (e) {
    const fallbackPath = path.resolve(__dirname, '../ios/App/export_options.plist');
    fs.writeFileSync(fallbackPath, exportOptionsContent, 'utf8');
    console.log(`✅ ExportOptions.plist 생성 완료 (fallback): ${fallbackPath}`);
}
