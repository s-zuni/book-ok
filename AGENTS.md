<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🤖 Book,ok AI Agent Operating Manual & Architecture Principles

이 문서는 **Book,ok(우리 아이 맞춤 독서 플랫폼)** 코드베이스에서 작업하는 모든 AI 어시스턴트 및 개발자가 반드시 준수해야 하는 **아키텍처 원칙, 기술 스택 가이드, 코딩 표준**을 정의합니다.

---

## 1. 서비스 개요 및 미션
- **서비스명**: Book,ok (북콕)
- **미션**: AI 기술과 공공/민간 도서 데이터를 결합하여 아이들의 독서 성향을 분석하고, 맞춤형 도서 추천 및 독서 기록·성장 솔루션을 제공하는 웹/앱 하이브리드 서비스입니다.
- **타겟 사용자**: 유아 및 초등학생 자녀를 둔 학부모, 어린이 독자, 서비스 관리자.

---

## 2. 코어 기술 스택
- **프론트엔드 프레임워크**: Next.js 16 (App Router, Turbopack, React 19)
- **모바일 하이브리드 컨테이너**: Capacitor 8 (iOS & Android)
- **스타일링**: Tailwind CSS v4 (`app/globals.css` 내 `@theme` 정의 활용), Lucide React
- **백엔드 & 데이터베이스**: Supabase (Auth, PostgreSQL DB with RLS, Storage, Deno Edge Functions)
- **외부 연동 API**: 알라딘 Open API, 국립중앙도서관(도서관정보나루), OpenAI API (Edge Functions 경유)
- **상태 & 알림**: React Context (`AuthContext`, `LoginModalContext`), Sonner (`toast`)

---

## 3. 디렉터리 구조 및 FSD 아키텍처 원칙

본 프로젝트는 유지보수성과 확장성을 극대화하기 위해 **FSD(Feature-Sliced Design) 경량화 패턴**을 엄격하게 적용합니다.

```
bookok-app/
├── app/                  # [Layer 4: Routing & Orchestration] Next.js App Router
│   ├── (main)/           # 사용자 서비스 화면군 (home, book, chat, community, mypage, solution)
│   ├── admin/            # 관리자 대시보드
│   ├── auth/             # 인증 라우트 (OAuth callback 등)
│   ├── intro/ /landing/  # 온보딩 및 랜딩 페이지
│   ├── layout.tsx        # 글로벌 루트 레이아웃
│   └── globals.css       # Tailwind v4 글로벌 스타일
├── src/
│   ├── widgets/          # [Layer 3: Composition] 독립적 복합 UI 블록 (home, hero, solution, chatbot 등)
│   ├── features/         # [Layer 2: Domain Logic] 비즈니스 로직 단위 모듈 (auth, books, children, reading)
│   ├── shared/           # [Layer 1: Foundation] 공통 기반 (api, lib, types, ui, utils)
│   └── middleware.ts     # 세션 및 라우트 보호 미들웨어
├── supabase/             # Deno Edge Functions & Config
├── android/ / ios/       # Capacitor 네이티브 플랫폼 프로젝트
├── assets/               # 네이티브 앱 생성용 원본 에셋 (icon, splash)
├── docs/                 # 프로젝트 설계 문서, 디자인 시스템(Design.md), SVG 다이어그램
├── public/               # 정적 웹 에셋 (fonts, icons, images, manifest)
└── scripts/              # 빌드 및 자동화 스크립트
```

### 🚨 의존성 방향 원칙 (Dependency Inversion Rule)
코드의 결합도를 낮추고 스파게티 코드를 원천 차단하기 위해 **단방향 의존성 규칙**을 반드시 준수해야 합니다:
1. `app` ➡️ `widgets`, `features`, `shared` 참조 가능
2. `widgets` ➡️ `features`, `shared` 참조 가능 (`app` 참조 금지)
3. `features` ➡️ `shared` 참조 가능 (`widgets`, `app` 참조 금지, 타 `features` 간 순환 참조 금지)
4. `shared` ➡️ 어떠한 상위 레이어(`features`, `widgets`, `app`)도 참조할 수 없음 (순수 재사용 모듈)

---

## 4. AI 개발자가 반드시 지켜야 할 핵심 행동 규칙 (Non-negotiables)

### 1) Supabase Auth 및 모바일 웹뷰 락(Lock) 데드락 방지
- **금지**: `supabase.auth.onAuthStateChange` 콜백 내부에서 `await supabase.from(...)`과 같은 비동기 DB 쿼리를 직접 실행하지 마십시오. Supabase Auth의 내부 세션 락과 충돌하여 모바일 앱에서 영구 로딩(스켈레톤) 현상이 발생합니다.
- **원칙**: 인증 상태 변경 시 무거운 작업은 반드시 `setTimeout(..., 0)` 등으로 분리하여 Auth 이벤트 루프 탈출 후 실행하십시오.
- **클라이언트 인스턴스**: 항상 `@shared/lib/supabase`에 정의된 `supabase` 싱글톤 인스턴스(No-op lock 및 `CapacitorStorage` 설정 완료)를 사용하십시오.

### 2) 웹(SSR)과 모바일 앱(Static Export)의 분기 처리
- 본 프로젝트는 `npm run build:web` (Vercel SSR)과 `npm run build:app` (Capacitor `output: 'export'`) 두 가지 모드로 빌드됩니다.
- 네이티브 전용 API 호출 시 반드시 `Capacitor.isNativePlatform()`을 검사하십시오.
- 모바일 빌드를 깨뜨리는 서버 전용 Node.js 라이브러리를 클라이언트 컴포넌트에 직접 임포트하지 마십시오.

### 3) 디자인 시스템 및 UI 가이드라인 준수
- 디자인 변경이나 새 화면 추가 시 [`docs/Design.md`](docs/Design.md)의 원칙을 반드시 따르십시오.
  - **Primary Color**: `#2E5A44` (Forest Green - 브랜드, 주요 헤딩)
  - **Secondary Color**: `#16A34A` (CTA, 활성 버튼)
  - **Highlight Color**: `#FACC15` (수상/뱃지)
  - **Background**: `#FDFDFD` (배경)
  - **Font**: Pretendard
- 모바일 상하단 Safe Area(`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`)와 터치 딜레이 방지 스타일을 고려하십시오.

### 4) 데이터 무결성 및 보안
- 아동 개인정보(생년월일, 이름)와 부모의 독서 기록은 Supabase RLS 정책(`parent_id = auth.uid()`)에 의해 엄격히 보호되어야 합니다.
- API Key, Service Role Key 등 민감한 인증 정보를 프론트엔드 코드나 Git에 노출하지 마십시오. 외부 API(OpenAI, 알라딘, 도서관 등) 호출은 Supabase Edge Function을 경유하는 것을 기본으로 합니다.

### 5) 파일 및 형상 관리
- 루트 디렉터리에 임의의 SVG, 스크립트, 마크다운 파일을 생성하지 마십시오.
  - 설계/문서: `docs/`
  - 이미지/아이콘: `public/images/`, `public/icons/`
  - 스크립트: `scripts/`
- 코드 작업 후 반드시 `npm run typecheck`를 실행하여 컴파일 오류가 없는지 검증하십시오.

