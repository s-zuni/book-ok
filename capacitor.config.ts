import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: any = {
  appId: 'com.bookok.kr',
  appName: '북콕',
  webDir: 'out',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#FFFFFF",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Light,
      resizeOnFullScreen: true
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      clientId: "54141143854-1nahh5nueb5njrlvd748dkbm0a34sks9.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    }
  },
  ios: {
    backForwardNavigationGestures: true
  },
  hooks: {
    postSync: "node scripts/fix-spm-path.js"
  }
} as any;

export default config;
