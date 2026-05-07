/**
 * Bookok Native Bridge Utility & Hook
 * 웹뷰 환경에서 React Native 앱과 통신하기 위한 유틸리티입니다.
 */

import { useCallback, useEffect, useState } from 'react';

// --- Types ---

export type NativeMessageType = 
  | 'SHARE'           // 네이티브 공유 시트 열기
  | 'VIBRATE'         // 진동/햅틱 피드백
  | 'AUTH_SUCCESS'    // 로그인 성공 알림
  | 'AUTH_LOGOUT'     // 로그아웃 알림
  | 'OPEN_EXTERNAL'   // 외부 브라우저로 링크 열기
  | 'SET_STEP_COUNT'  // (예시) 걸음수 데이터 요청
  | 'CLOSE_APP'       // 앱 종료 (안드로이드 전용)
  | 'CONSOLE_LOG';    // 앱 터미널에 로그 남기기

interface NativeMessage {
  type: NativeMessageType;
  data?: any;
}

// --- Global Declaration ---

declare global {
  interface Window {
    __BOOKOK_NATIVE_APP__?: boolean;
    __BOOKOK_PLATFORM__?: 'ios' | 'android';
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

// --- Core Utilities ---

/**
 * 현재 환경이 네이티브 앱(WebView)인지 확인합니다.
 */
export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!window.__BOOKOK_NATIVE_APP__;
};

/**
 * 현재 OS 플랫폼을 반환합니다. ('ios' | 'android' | undefined)
 */
export const getNativePlatform = () => {
  if (typeof window === 'undefined') return undefined;
  return window.__BOOKOK_PLATFORM__;
};

/**
 * 앱으로 메시지를 전송합니다.
 */
export const sendToNative = (type: NativeMessageType, data?: any) => {
  if (typeof window === 'undefined') return;

  if (window.ReactNativeWebView) {
    const message: NativeMessage = { type, data };
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
    
    // 개발 모드에서 로그 확인용
    if (process.env.NODE_ENV === 'development') {
      console.log(`[NativeBridge] Sent: ${type}`, data);
    }
  } else if (isNativeApp()) {
    console.warn('[NativeBridge] ReactNativeWebView is not available even in Native App mode.');
  }
};

// --- React Hook ---

/**
 * 앱 환경에 대응하기 위한 React Hook입니다.
 */
export const useNativeBridge = () => {
  const [isApp, setIsApp] = useState<boolean>(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | undefined>(undefined);

  useEffect(() => {
    const nativeApp = isNativeApp();
    setIsApp(nativeApp);
    setPlatform(getNativePlatform());
  }, []);

  /**
   * 네이티브 공유 시트를 호출합니다.
   */
  const share = useCallback((options: { title?: string; message?: string; url?: string }) => {
    sendToNative('SHARE', options);
  }, []);

  /**
   * 햅틱 피드백(진동)을 트리거합니다.
   */
  const vibrate = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium') => {
    sendToNative('VIBRATE', { type });
  }, []);

  /**
   * 외부 브라우저로 URL을 엽니다.
   */
  const openExternal = useCallback((url: string) => {
    sendToNative('OPEN_EXTERNAL', { url });
  }, []);

  /**
   * 로그아웃 상태를 앱에 알립니다.
   */
  const notifyLogout = useCallback(() => {
    sendToNative('AUTH_LOGOUT');
  }, []);

  return {
    isApp,
    platform,
    share,
    vibrate,
    openExternal,
    notifyLogout,
    sendToNative, // 저수준 API 직접 호출용
  };
};
