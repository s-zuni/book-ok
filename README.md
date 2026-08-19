# 📚 Book,ok (북콕) - 우리 아이 맞춤 독서 플랫폼

Book,ok은 AI 기반의 자녀 맞춤 도서 추천 및 독서 활동 관리 하이브리드(Web & Mobile App) 서비스입니다.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Mobile Hybrid**: Capacitor 8 (iOS & Android)
- **Styling**: Tailwind CSS v4, Lucide React
- **Backend / Database**: Supabase (Auth, Database, Storage, Edge Functions)
- **Language**: TypeScript

---

## 📁 디렉터리 구조 (Directory Structure)

```
bookok-app/
├── app/                  # Next.js App Router (페이지 및 레이아웃)
│   ├── (main)/           # 사용자 메인 서비스 라우트 (홈, 도서상세, 마이페이지, 커뮤니티 등)
│   ├── admin/            # 관리자 대시보드 및 통계 화면
│   ├── auth/             # 소셜 로그인 및 OAuth 콜백 라우트
│   ├── intro/ /landing/  # 소개 및 랜딩 페이지
│   ├── layout.tsx        # 글로벌 루트 레이아웃
│   └── globals.css       # 글로벌 Tailwind CSS
├── src/                  # FSD(Feature-Sliced Design) 기반 아키텍처
│   ├── features/         # 특정 도메인 비즈니스 로직 및 모달 (auth, books, children, reading)
│   ├── widgets/          # 재사용 가능한 대단위 컴포넌트 (hero, home, solution, chatbot 등)
│   ├── shared/           # 공통 모듈 (API 클라이언트, Supabase 설정, 공통 UI, 유틸리티, 타입)
│   └── middleware.ts     # Next.js 미들웨어 (세션 및 라우트 보호)
├── public/               # 정적 웹 에셋
│   ├── fonts/            # Pretendard 웹폰트
│   ├── icons/            # PWA 및 웹 매니페스트 아이콘
│   ├── images/           # 서비스 이미지 및 로고
│   └── manifest.webmanifest
├── assets/               # Capacitor 네이티브 앱 생성용 원본 에셋 (icon.png, splash.png)
├── docs/                 # 프로젝트 문서 및 설계 가이드
│   ├── designs/          # 아키텍처 및 UI 와이어프레임 다이어그램 (SVG)
│   ├── Design.md         # 디자인 시스템 및 UX/UI 가이드라인
│   └── README.md         # 문서 색인
├── scripts/              # 빌드 및 배포 자동화 스크립트
│   ├── build-cap.js      # Capacitor 앱 빌드 파이프라인
│   ├── fix-spm-path.js   # iOS SPM 빌드 경로 패치
│   └── scratch/          # 개발/테스트용 임시 스크립트
├── supabase/             # Supabase 설정 및 Edge Functions
│   ├── functions/        # Deno 기반 Edge Functions (chat, library, recommendations 등)
│   └── config.toml       # Supabase 로컬 개발 설정
├── android/              # Android 네이티브 프로젝트 (Capacitor)
├── ios/                  # iOS 네이티브 프로젝트 (Capacitor)
├── capacitor.config.ts   # Capacitor 설정
├── next.config.ts        # Next.js 빌드 설정
└── tsconfig.json         # TypeScript 설정
```

---

## 🚀 시작하기 (Getting Started)

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 타입 검사 및 린트
```bash
npm run typecheck
npm run lint
```

---

## 📦 빌드 및 배포 (Build & Deployment)

### 웹 버전 빌드 (Vercel SSR/ISR)
```bash
npm run build:web
```

### 모바일 앱 빌드 (Capacitor Static Export & Sync)
```bash
npm run build:app
```

---

## 📄 가이드 및 컨벤션

- **디자인 시스템**: [docs/Design.md](docs/Design.md) 참조
- **신규 컴포넌트 추가**:
  - 특정 도메인 로직/상태를 다루는 모달 및 비즈니스 기능은 `src/features/`에 작성
  - 페이지 내 대단위 섹션 및 위젯은 `src/widgets/`에 작성
  - 순수 공통 UI 컴포넌트는 `src/shared/ui/`에 작성
