const fs = require('fs');
const path = require('path');

const pbxprojPath = path.join(__dirname, '../ios/App/App.xcodeproj/project.pbxproj');
const entitlementsPath = path.join(__dirname, '../ios/App/App/App.entitlements');

// 1. App.entitlements 파일 내용 정의
const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.applesignin</key>
	<array>
		<string>Default</string>
	</array>
</dict>
</plist>
`;

// App.entitlements 파일 생성
console.log('Creating App.entitlements file...');
fs.writeFileSync(entitlementsPath, entitlementsContent, 'utf8');

// 2. project.pbxproj 수정
console.log('Modifying project.pbxproj to add CODE_SIGN_ENTITLEMENTS...');
let pbxprojContent = fs.readFileSync(pbxprojPath, 'utf8');

// PRODUCT_BUNDLE_IDENTIFIER 설정 부분에 CODE_SIGN_ENTITLEMENTS 추가
if (!pbxprojContent.includes('CODE_SIGN_ENTITLEMENTS')) {
    pbxprojContent = pbxprojContent.replace(
        /PRODUCT_BUNDLE_IDENTIFIER = com\.bookok\.kr;/g,
        'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.bookok.kr;'
    );
    fs.writeFileSync(pbxprojPath, pbxprojContent, 'utf8');
    console.log('Successfully updated project.pbxproj!');
} else {
    console.log('CODE_SIGN_ENTITLEMENTS is already configured in project.pbxproj.');
}
