import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bookok.app',
  appName: '북콕',
  webDir: 'out',
  server: {
    // ⚠️ 실제 배포된 웹사이트 주소로 수정하세요
    url: 'https://bookok.app',
    cleartext: true
  }
};

export default config;
