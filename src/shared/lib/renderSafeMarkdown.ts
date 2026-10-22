import { marked } from "marked";
import DOMPurify from "dompurify";

/**
 * 마크다운을 안전한 HTML 문자열로 변환한다. (AI 총평처럼 외부에서 생성된 텍스트용)
 * marked는 HTML을 정화하지 않으므로 DOMPurify로 한 번 더 걸러 스크립트·링크·이미지를 제거한다.
 * 브라우저 환경이 아니면(SSR) 빈 문자열을 돌려준다.
 */
export function renderSafeMarkdown(markdown: string | undefined | null): string {
    if (typeof window === "undefined") return "";
    const html = marked.parse(markdown || "", { async: false }) as string;
    return DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ["a", "img", "iframe", "form", "input", "style", "script"],
        FORBID_ATTR: ["style", "href", "src"],
    });
}
