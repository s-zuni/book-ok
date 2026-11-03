/**
 * Bookok Native Bridge Utility & Hook
 * Capacitor 8 네이티브 앱 환경과의 원활한 통신 및 감지를 지원합니다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Browser } from '@capacitor/browser';
import { Share } from '@capacitor/share';
import { App } from '@capacitor/app';

// --- Types ---

export type NativeMessageType = 
  | 'SHARE'           // 네이티브 공유 시트 열기
  | 'VIBRATE'         // 진동/햅틱 피드백
  | 'AUTH_SUCCESS'    // 로그인 성공 알림
  | 'AUTH_LOGOUT'     // 로그아웃 알림
  | 'OPEN_EXTERNAL'   // 외부 브라우저로 링크 열기
  | 'CLOSE_APP'       // 앱 종료 (안드로이드 전용)
  | 'CONSOLE_LOG';    // 콘솔 로그

export interface NativeMessage {
  type: NativeMessageType;
  data?: unknown;
}

// --- Core Utilities ---

/**
 * 현재 환경이 Capacitor 네이티브 앱(iOS/Android)인지 확인합니다.
 */
export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * 현재 OS 플랫폼을 반환합니다. ('ios' | 'android' | undefined)
 */
export const getNativePlatform = (): 'ios' | 'android' | undefined => {
  const p = Capacitor.getPlatform();
  return p === 'ios' || p === 'android' ? p : undefined;
};

/**
 * 네이티브 기능 또는 브릿지 메시지를 실행합니다.
 */
export const sendToNative = async (type: NativeMessageType, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[NativeBridge] Event: ${type}`, data);
  }

  if (!isNativeApp()) return;

  try {
    switch (type) {
      case 'SHARE':
        if (data && (data.title || data.text || data.url)) {
          await Share.share({
            title: data.title,
            text: data.message || data.text,
            url: data.url,
            dialogTitle: data.title,
          });
        }
        break;
      case 'VIBRATE':
        if (data?.type === 'heavy') {
          await Haptics.impact({ style: ImpactStyle.Heavy });
        } else if (data?.type === 'light') {
          await Haptics.impact({ style: ImpactStyle.Light });
        } else if (data?.type === 'success') {
          await Haptics.notification({ type: NotificationType.Success });
        } else {
          await Haptics.impact({ style: ImpactStyle.Medium });
        }
        break;
      case 'OPEN_EXTERNAL':
        if (data?.url) {
          await Browser.open({ url: data.url });
        }
        break;
      case 'CLOSE_APP':
        if (Capacitor.getPlatform() === 'android') {
          await App.exitApp();
        }
        break;
      default:
        break;
    }
  } catch (err) {
    console.warn('[NativeBridge] execution error:', err);
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
    setIsApp(isNativeApp());
    setPlatform(getNativePlatform());
  }, []);

  /**
   * 네이티브 공유 시트를 호출합니다.
   */
  const share = useCallback((options: { title?: string; message?: string; url?: string }) => {
    void sendToNative('SHARE', options);
  }, []);

  /**
   * 햅틱 피드백(진동)을 트리거합니다.
   */
  const vibrate = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium') => {
    void sendToNative('VIBRATE', { type });
  }, []);

  /**
   * 외부 브라우저로 URL을 엽니다.
   */
  const openExternal = useCallback((url: string) => {
    void sendToNative('OPEN_EXTERNAL', { url });
  }, []);

  /**
   * 로그아웃 상태를 앱에 알립니다.
   */
  const notifyLogout = useCallback(() => {
    void sendToNative('AUTH_LOGOUT');
  }, []);

  return {
    isApp,
    platform,
    share,
    vibrate,
    openExternal,
    notifyLogout,
    sendToNative,
  };
};
