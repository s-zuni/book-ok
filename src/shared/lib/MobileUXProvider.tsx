"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { App as CapacitorApp } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export default function MobileUXProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const exitToastId = useRef<string | number | null>(null);
  const lastBackPressTime = useRef<number>(0);
  const isNavigating = useRef(false);

  // 1. iOS Native Edge-Swipe Back Gesture Handler
  useEffect(() => {
    if (typeof window === "undefined") return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isEdgeSwipe = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      // Detect touch start at the left edge (within 35px)
      if (touch.clientX <= 35) {
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isEdgeSwipe = true;
      } else {
        isEdgeSwipe = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isEdgeSwipe || isNavigating.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = Math.abs(touch.clientY - touchStartY);

      // Horizontal swipe right with minimal vertical movement
      if (deltaX > 75 && deltaY < 45) {
        isEdgeSwipe = false;
        if (pathname !== "/") {
          isNavigating.current = true;
          if (Capacitor.isNativePlatform()) {
            Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
          }
          router.back();
          setTimeout(() => {
            isNavigating.current = false;
          }, 500);
        }
      }
    };

    const handleTouchEnd = () => {
      isEdgeSwipe = false;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [pathname, router]);

  // 2. Native Platform Features (Android Back Button, Network Status, etc.)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const platform = Capacitor.getPlatform();

    // iOS: Enable smooth scrolling and rubber-band physics
    if (platform === 'ios') {
      document.documentElement.style.setProperty('-webkit-overflow-scrolling', 'touch');
      document.body.style.setProperty('-webkit-overflow-scrolling', 'touch');
      document.body.style.overscrollBehaviorX = 'auto';
    }

    // 안드로이드 백 버튼 핸들러
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

    // 오프라인 네트워크 감지 핸들러
    const networkListener = Network.addListener("networkStatusChange", (status) => {
      if (!status.connected) {
        toast.error("네트워크 연결이 끊겼습니다.", {
          description: "인터넷 연결 상태를 확인해주세요.",
          duration: Infinity,
          id: "offline-toast"
        });
      } else {
        toast.dismiss("offline-toast");
        toast.success("네트워크가 다시 연결되었습니다.", {
          duration: 2000,
        });
      }
    });

    // 초기 네트워크 상태 체크
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
    };
  }, [pathname, router]);

  return <>{children}</>;
}
