import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { LiteracyAssessment } from "@shared/types";
import { AREA_METADATA, buildRadarChartData } from "./scoring";

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

const FONT_STACK = "'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

/** 공유 링크의 기준 주소. 네이티브 앱에서는 origin이 capacitor://이므로 환경변수 필요 */
export function getShareBaseUrl(): string {
    const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    if (fromEnv) return fromEnv;
    if (typeof window !== "undefined" && /^https?:/.test(window.location.origin)) {
        return window.location.origin;
    }
    return "";
}

/** 공유 링크 (유입 채널 측정용 UTM 포함). 기준 주소를 알 수 없으면 빈 문자열 */
export function buildShareUrl(source = "share_card"): string {
    const base = getShareBaseUrl();
    if (!base) return "";
    const params = new URLSearchParams({
        utm_source: source,
        utm_medium: "referral",
        utm_campaign: "literacy_check",
    });
    // 소개(목록) 화면으로 연결한다. /solution/literacy는 열리자마자 지문 세션을 시작하므로 쓰지 않는다.
    params.set("tab", "literacy");
    return `${base}/solution?${params.toString()}`;
}

async function ensureFonts() {
    if (typeof document === "undefined" || !document.fonts) return;
    try {
        await Promise.all([
            document.fonts.load(`900 64px ${FONT_STACK}`),
            document.fonts.load(`800 32px ${FONT_STACK}`),
            document.fonts.load(`600 28px ${FONT_STACK}`),
        ]);
        await document.fonts.ready;
    } catch {
        // 폰트 로딩 실패 시 시스템 폰트로 그린다
    }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawRadar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    points: { subject: string; childScore: number }[]
) {
    const n = points.length;
    const angleOf = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const at = (i: number, r: number) => ({
        x: cx + Math.cos(angleOf(i)) * r,
        y: cy + Math.sin(angleOf(i)) * r,
    });

    // 격자
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 2;
    for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const p = at(i, (radius * ring) / 4);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();
    }
    for (let i = 0; i < n; i++) {
        const p = at(i, radius);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    }

    // 점수 영역
    ctx.beginPath();
    points.forEach((pt, i) => {
        const p = at(i, (radius * Math.min(Math.max(pt.childScore, 0), 100)) / 100);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(22,163,74,0.32)";
    ctx.fill();
    ctx.strokeStyle = "#16A34A";
    ctx.lineWidth = 6;
    ctx.stroke();

    points.forEach((pt, i) => {
        const p = at(i, (radius * Math.min(Math.max(pt.childScore, 0), 100)) / 100);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = "#16A34A";
        ctx.fill();
    });

    // 라벨
    ctx.fillStyle = "#1F2937";
    ctx.font = `800 32px ${FONT_STACK}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    points.forEach((pt, i) => {
        const p = at(i, radius + 52);
        ctx.fillText(pt.subject, p.x, p.y);
        ctx.font = `600 26px ${FONT_STACK}`;
        ctx.fillStyle = "#2E5A44";
        ctx.fillText(String(pt.childScore), p.x, p.y + 34);
        ctx.font = `800 32px ${FONT_STACK}`;
        ctx.fillStyle = "#1F2937";
    });
}

/**
 * 문해력 점검 결과 공유 이미지(4:5, 1080x1350 PNG) 생성.
 * 아동 개인정보 보호를 위해 이름·생년월일 등은 카드에 넣지 않는다.
 */
export async function renderLiteracyShareCard(assessment: LiteracyAssessment): Promise<Blob> {
    await ensureFonts();

    const canvas = document.createElement("canvas");
    canvas.width = SHARE_CARD_WIDTH;
    canvas.height = SHARE_CARD_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이미지를 만들 수 없는 환경이에요.");

    const W = SHARE_CARD_WIDTH;
    const H = SHARE_CARD_HEIGHT;

    // 배경
    ctx.fillStyle = "#FDFDFD";
    ctx.fillRect(0, 0, W, H);

    // 상단 그린 헤더
    const grad = ctx.createLinearGradient(0, 0, W, 520);
    grad.addColorStop(0, "#2E5A44");
    grad.addColorStop(1, "#1E3F2F");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 520);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.arc(W - 80, 60, 220, 0, Math.PI * 2);
    ctx.fill();

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = "#D1FAE5";
    ctx.font = `800 36px ${FONT_STACK}`;
    ctx.fillText("Book,ok", 72, 108);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `900 58px ${FONT_STACK}`;
    ctx.fillText("우리 아이 문해력 점검", 72, 210);

    ctx.fillStyle = "#A7F3D0";
    ctx.font = `600 30px ${FONT_STACK}`;
    ctx.fillText(assessment.grade_label || `초등 ${assessment.grade_level}학년`, 72, 262);

    // 점수
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `900 190px ${FONT_STACK}`;
    const scoreText = String(assessment.total_bli_score);
    ctx.fillText(scoreText, 72, 456);
    const scoreWidth = ctx.measureText(scoreText).width;
    ctx.font = `800 44px ${FONT_STACK}`;
    ctx.fillStyle = "#A7F3D0";
    ctx.fillText("/ 100", 72 + scoreWidth + 16, 456);

    // 등급 배지
    const tier = assessment.bli_tier;
    ctx.font = `900 36px ${FONT_STACK}`;
    const badgeW = ctx.measureText(tier).width + 72;
    roundRect(ctx, W - 72 - badgeW, 376, badgeW, 80, 40);
    ctx.fillStyle = "#FACC15";
    ctx.fill();
    ctx.fillStyle = "#1A1A1A";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tier, W - 72 - badgeW / 2, 417);

    // 레이더
    drawRadar(ctx, W / 2, 840, 230, buildRadarChartData(assessment));

    // 강점/보완 칩
    const strength = AREA_METADATA[assessment.strength_area]?.label || "";
    const weakest = AREA_METADATA[assessment.weakest_area]?.label || "";
    const isBalanced = assessment.weakest_area === "balanced";
    const chip = (x: number, label: string, value: string, bg: string, fg: string) => {
        roundRect(ctx, x, 1118, 444, 96, 28);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.fillStyle = fg;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.font = `700 24px ${FONT_STACK}`;
        ctx.fillText(label, x + 32, 1156);
        ctx.font = `900 34px ${FONT_STACK}`;
        ctx.fillText(value, x + 32, 1196);
    };
    chip(72, "🌟 상대적으로 잘한 영역", isBalanced ? "차이 없음" : strength, "#E8F5E9", "#2E5A44");
    chip(W - 72 - 444, "🌱 더 살펴볼 영역", isBalanced ? "차이 없음" : weakest, "#FEF3C7", "#92400E");

    // 푸터
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#2E5A44";
    ctx.font = `800 30px ${FONT_STACK}`;
    ctx.fillText("3분 문해력 점검 · Book,ok 에서 해보세요", W / 2, 1272);
    ctx.fillStyle = "#9CA3AF";
    ctx.font = `600 22px ${FONT_STACK}`;
    ctx.fillText("지문 1편 기준의 참고용 결과입니다", W / 2, 1316);

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("이미지 생성에 실패했어요."))), "image/png");
    });
}

export type ShareResult = "shared" | "downloaded" | "cancelled";

/** 가능하면 OS 공유 시트(이미지 첨부)를, 아니면 이미지 다운로드로 처리 */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("이미지를 읽을 수 없어요."));
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.readAsDataURL(blob);
    });
}

async function shareNative(blob: Blob, text: string, url: string): Promise<ShareResult> {
    const written = await Filesystem.writeFile({
        path: "bookok-literacy-card.png",
        data: await blobToBase64(blob),
        directory: Directory.Cache,
    });
    try {
        await Share.share({ text: url ? `${text}\n${url}` : text, files: [written.uri] });
        return "shared";
    } catch (err) {
        // 사용자가 공유 시트를 닫은 경우
        if (err instanceof Error && /cancel/i.test(err.message)) return "cancelled";
        throw err;
    }
}

export async function shareOrDownloadCard(blob: Blob, text: string, url: string): Promise<ShareResult> {
    if (Capacitor.isNativePlatform()) {
        try {
            return await shareNative(blob, text, url);
        } catch (err) {
            console.warn("native share failed:", err);
            throw new Error("공유하지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
    }
    const file = new File([blob], "bookok-literacy-card.png", { type: "image/png" });
    const nav = typeof navigator !== "undefined" ? navigator : undefined;

    if (nav?.share && nav.canShare?.({ files: [file] })) {
        try {
            await nav.share({ files: [file], text: url ? `${text}\n${url}` : text });
            return "shared";
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
            // 공유 실패 시 다운로드로 대체
        }
    }

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = "bookok-literacy-card.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    return "downloaded";
}
