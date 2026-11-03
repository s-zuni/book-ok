"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import LandingPage from "./LandingPage";

/** 데스크톱 웹(≥1024px)에서도 서비스 화면 그대로 보여야 하는 공개 경로 (공유 링크, 검색 유입, 스토어/심사용 문서) */
const DESKTOP_APP_PATHS = ["/book", "/community/post", "/privacy", "/terms"];

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
    const mql = window.matchMedia(DESKTOP_QUERY);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;
// 서버/정적 export 렌더에서는 항상 모바일 기준(앱 화면)으로 그린다
const getServerSnapshot = () => false;

export function isDesktopAppPath(pathname: string | null): boolean {
    const path = (pathname || "/").replace(/\/+$/, "") || "/";
    return DESKTOP_APP_PATHS.some(p => path === p || path.startsWith(`${p}/`));
}

/**
 * 데스크톱 웹 접속 시 서비스 화면 대신 랜딩 페이지를 보여준다.
 * - 네이티브 앱(Capacitor, iPad 포함)은 항상 앱 화면을 쓴다.
 * - 공개 경로(DESKTOP_APP_PATHS)는 데스크톱에서도 기존 화면을 쓴다.
 * - 인증(/auth)과 관리자(/admin)는 (main) 레이아웃 밖이라 영향받지 않는다.
 */
export default function DesktopLandingGate({ children, desktopOnly }: { children: React.ReactNode; desktopOnly?: React.ReactNode }) {
    const pathname = usePathname();
    const isDesktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const showLanding = isDesktop && !Capacitor.isNativePlatform() && !isDesktopAppPath(pathname);

    if (showLanding) return <LandingPage />;
    return (
        <>
            {children}
            {desktopOnly}
        </>
    );
}
