"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@features/auth/AuthContext";
import { getServiceInfo, touchSession, recordServiceStay, ServiceMeta } from "@shared/lib/analytics";
import { App } from "@capacitor/app";
import { Capacitor, PluginListenerHandle } from "@capacitor/core";

export default function AnalyticsTracker() {
    const pathname = usePathname();
    const { user } = useAuth();

    const currentPathRef = useRef<string>(pathname);
    const currentServiceRef = useRef<ServiceMeta | null>(getServiceInfo(pathname));
    const enterTimestampRef = useRef<number>(Date.now());
    const isVisibleRef = useRef<boolean>(true);
    const userIdRef = useRef<string | null>(user?.id || null);

    // Sync user id ref
    useEffect(() => {
        userIdRef.current = user?.id || null;
        touchSession(userIdRef.current);
    }, [user?.id]);

    // Flush current service stay time
    const flushStayTime = useCallback(() => {
        const now = Date.now();
        const service = currentServiceRef.current;
        const path = currentPathRef.current;
        const enterTime = enterTimestampRef.current;

        if (!service || !isVisibleRef.current) {
            enterTimestampRef.current = now;
            return;
        }

        const elapsedSeconds = Math.round((now - enterTime) / 1000);
        // 1초 이상 머물렀을 때만 기록
        if (elapsedSeconds >= 1) {
            recordServiceStay(service, path, elapsedSeconds, userIdRef.current);
        }

        enterTimestampRef.current = now;
    }, []);

    // 1. 라우트 이동 감지
    useEffect(() => {
        if (currentPathRef.current !== pathname) {
            // 이전 페이지 체류 시간 flush
            flushStayTime();

            // 새 페이지 설정
            currentPathRef.current = pathname;
            currentServiceRef.current = getServiceInfo(pathname);
            enterTimestampRef.current = Date.now();

            // 세션 갱신
            touchSession(userIdRef.current);
        }
    }, [pathname, flushStayTime]);

    // 2. 주기적 Heartbeat (25초마다 진행 중인 체류시간 누적 기록)
    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                flushStayTime();
            }
        }, 25000);

        return () => clearInterval(interval);
    }, [flushStayTime]);

    // 3. 탭 전환/화면 숨김(visibilitychange) & 브라우저 종료 감지
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                isVisibleRef.current = false;
                flushStayTime();
            } else if (document.visibilityState === 'visible') {
                isVisibleRef.current = true;
                enterTimestampRef.current = Date.now();
                touchSession(userIdRef.current);
            }
        };

        const handleBeforeUnload = () => {
            flushStayTime();
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handleBeforeUnload);

        // 4. Capacitor 모바일 앱 백그라운드 전환 감지
        let appStateSub: PluginListenerHandle | null = null;
        if (Capacitor.isNativePlatform()) {
            App.addListener('appStateChange', ({ isActive }) => {
                if (!isActive) {
                    isVisibleRef.current = false;
                    flushStayTime();
                } else {
                    isVisibleRef.current = true;
                    enterTimestampRef.current = Date.now();
                    touchSession(userIdRef.current);
                }
            }).then(handle => {
                appStateSub = handle;
            }).catch(() => {});
        }

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handleBeforeUnload);
            if (appStateSub) {
                appStateSub.remove();
            }
            flushStayTime();
        };
    }, [flushStayTime]);

    return null;
}

