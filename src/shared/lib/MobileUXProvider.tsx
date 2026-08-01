"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { App as CapacitorApp } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

export default function MobileUXProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const exitToastId = useRef<string | number | null>(null);
  const lastBackPressTime = useRef<number>(0);

  useEffect(() => {
    // 웹 환경이면 실행하지 않음
    if (!Capacitor.isNativePlatform()) return;

    const platform = Capacitor.getPlatform();

    // iOS: Enable smooth scrolling and rubber-band physics
    if (platform === 'ios') {
      document.documentElement.style.setProperty('-webkit-overflow-scrolling', 'touch');
      document.body.style.setProperty('-webkit-overflow-scrolling', 'touch');
      // Ensure overscroll behavior allows native gestures
      document.body.style.overscrollBehaviorX = 'auto';
    }

    // 1. 안드로이드 백 버튼 핸들러
    const backButtonListener = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      const currentTime = new Date().getTime();

      // 루트 페이지이거나 더 이상 뒤로 갈 수 없는 경우
      if (pathname === "/" || !canGoBack) {
        if (currentTime - lastBackPressTime.current < 2000) {
          // 2초 내에 두 번 누르면 앱 종료
          CapacitorApp.exitApp();
        } else {
          lastBackPressTime.current = currentTime;
          exitToastId.current = toast("뒤로 가기 버튼을 한 번 더 누르면 종료됩니다.", {
            duration: 2000,
            position: "bottom-center",
          });
        }
      } else {
        // 라우터 뒤로가기 실행
        router.back();
      }
    });

    // 2. 오프라인 네트워크 감지 핸들러
    const networkListener = Network.addListener("networkStatusChange", (status) => {
      if (!status.connected) {
        toast.error("네트워크 연결이 끊겼습니다.", {
          description: "인터넷 연결 상태를 확인해주세요.",
          duration: Infinity, // 다시 연결될 때까지 유지하거나 수동으로 닫을 수 있게 설정 가능
          id: "offline-toast"
        });
      } else {
        toast.dismiss("offline-toast");
        toast.success("네트워크가 다시 연결되었습니다.", {
          duration: 2000,
        });
      }
    });

    // 3. iOS: popstate listener to sync Next.js router with WebView back/forward navigation
    const handlePopState = () => {
      // When iOS swipe-back fires, the WebView history changes but Next.js router
      // may not be aware. This ensures the router state stays synchronized.
      router.refresh();
    };
    if (platform === 'ios') {
      window.addEventListener('popstate', handlePopState);
    }

    // 초기 네트워크 상태 체크 (앱 켤 때 이미 오프라인인 경우)
    const checkInitialNetwork = async () => {
      const status = await Network.getStatus();
      if (!status.connected) {
        toast.error("네트워크 연결이 끊겼습니다.", {
          description: "인터넷 연결 상태를 확인해주세요.",
          duration: Infinity,
          id: "offline-toast"
        });
      }
    };
    checkInitialNetwork();

    return () => {
      backButtonListener.then((listener) => listener.remove());
      networkListener.then((listener) => listener.remove());
      if (platform === 'ios') {
        window.removeEventListener('popstate', handlePopState);
      }
    };
  }, [pathname, router]);

  return <>{children}</>;
}
