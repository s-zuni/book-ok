# 🎨 Book,ok Design System & UX/UI Principles (design.md)

이 문서는 **Book,ok(우리 아이 맞춤 독서 플랫폼)**의 모든 시각적 언어, 사용자 경험(UX) 원칙, 컴포넌트 설계 표준을 총망라한 **공식 디자인 시스템 가이드**입니다.
AI 어시스턴트와 개발자는 새로운 UI를 설계하거나 기존 컴포넌트를 수정할 때 본 가이드라인을 반드시 준수해야 합니다.

---

## 🌟 1. 핵심 브랜드 아이덴티티 (Core Identity)

- **서비스명**: Book,ok (우리 아이 맞춤 독서 플랫폼)
- **디자인 무드**: **"Sophisticated Child-friendly" (세련되고 따뜻한 아동 친화적 감성)**
- **핵심 철학**:
  1. **유치하지 않은 세련미**: 지나치게 유아틱하거나 산만한 원색을 지양하고, 부모에게는 높은 교육적 신뢰감을, 아이에게는 친근하고 따뜻한 공간을 선사합니다.
  2. **자연과 숲의 편안함**: 자연의 푸른 숲을 연상시키는 Forest Green을 메인으로 삼아 눈의 피로를 덜고 안정적인 독서 분위기를 조성합니다.
  3. **넓은 여백과 부드러운 곡선**: 넉넉한 패딩과 과감하게 둥근 모서리(Pillowy Softness)를 통해 편안하고 정갈한 프리미엄 서비스를 표현합니다.

---

## 🎨 2. 컬러 팔레트 및 토큰 (Color Tokens)

| 토큰명 | 색상 코드 | 용도 및 가이드라인 |
| :--- | :--- | :--- |
| **Primary (Forest)** | `#2E5A44` | 메인 브랜드 컬러, 주요 헤딩, 로고, 최상단 브랜드 강조 |
| **Secondary (Green)** | `#16A34A` | 핵심 CTA 버튼, 활성 탭, 완료 상태, 긍정적 지표 |
| **Highlight (Gold/Yellow)** | `#FACC15` | 수상 내역, 추천 뱃지, 독서 별점(Star), 주목 포인트 |
| **Background** | `#FDFDFD` | 페이지 전체 배경 (순백색의 눈부심을 줄인 오프화이트) |
| **Surface** | `#FFFFFF` | 카드, 모달, 입력창, 하단 바 배경 |
| **Sub-Surface** | `#F9FAFB` | 섹션 간 분리 배경, 비활성 버튼, 회색 칩 배경 |
| **Text Main** | `#1A1A1A` | 본문, 카드 제목, 주요 헤드라인 (높은 가독성) |
| **Text Sub / Muted** | `#6B7280` / `#9CA3AF` | 부연 설명, 출판사/저자 정보, 날짜 등 메타 데이터 |
| **Border / Divider** | `#F3F4F6` / `#E5E7EB` | 카드 테두리, 리스트 구분선 (아주 연하고 섬세하게) |
| **Success / Available** | `#059669` / `#D1FAE5` | 도서 대출 가능 뱃지, 성공 토스트 |
| **Warning / Unavailable** | `#DC2626` / `#FEE2E2` | 대출 불가 뱃지, 경고, 삭제 버튼 |

---

## ✍️ 3. 타이포그래피 (Typography)

- **기본 폰트**: `Pretendard Variable`, sans-serif
- **한국어 가독성 최적화 필수 규칙**:
  - `word-break: keep-all`: 단어 단위 줄바꿈을 적용하여 어색한 글자 끊김 방지
  - `letter-spacing: -0.02em` (제목 계열) / `-0.01em` (본문 계열): 한국어 최적 자간
  - `line-height: 1.6`: 여유 있는 행간으로 부모와 아이 모두에게 쾌적한 가독성 확보

### 계층 구조 (Type Hierarchy)
- **Display / Hero**: `text-3xl lg:text-5xl`, `font-black`, `tracking-tighter`, `text-[#2E5A44]`
- **Section Heading**: `text-xl lg:text-2xl`, `font-bold`, `text-[#1A1A1A]`
- **Card Title**: `text-base lg:text-lg`, `font-bold`, `line-clamp-2`
- **Body / Content**: `text-sm lg:text-base`, `font-medium`, `text-[#1A1A1A]`, `leading-relaxed`
- **Caption / Badge**: `text-xs`, `font-semibold`, `tracking-tight`

---

## 📐 4. 형태와 공간 (Shape & Spacing)

### 4.1 모서리 곡률 (Border Radius)
- **컨테이너 / 대형 카드**: `rounded-[28px]` ~ `rounded-[36px]` (부드러운 조약돌 형태)
- **도서 표지 이미지**: `rounded-xl` (`rounded-2xl` 지양 - 책 고유 형태 보존)
- **버튼 및 입력 필드**: `rounded-2xl` 또는 완전한 캡슐형 `rounded-full`
- **바텀시트 / 모달 상단**: `rounded-t-[32px]`

### 4.2 그림자와 테두리 (Shadows & Borders)
- **기본 원칙**: 짙은 그림자는 지양하고, **아주 옅은 확산형 그림자 + 미세한 테두리** 조합 사용
- **클래스 표준**: `border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]`
- **Hover 효과**: `hover:-translate-y-1 hover:shadow-md transition-all duration-300`

---

## 📱 5. 모바일 하이브리드 UX 표준 (Mobile-First UX)

1. **안전 영역 (Safe Area) 준수**:
   - 상단 헤더: `pt-[env(safe-area-inset-top,0px)]`
   - 하단 탭바: `pb-[env(safe-area-inset-bottom,0px)]`
2. **터치 인터랙션 최적화**:
   - 터치 타겟 최소 크기: **44px × 44px** 이상 확보
   - 터치 반응성: 모바일 클릭 시 딜레이 없는 즉각 반응 (`active:scale-95 active:opacity-90 transition-transform`)
   - 터치 하이라이트 제거: `-webkit-tap-highlight-color: transparent`
3. **하단 고정 네비게이션 (`MobileBottomNav`)**:
   - 홈(Home), 솔루션(Solution), 챗봇(AI사서), 커뮤니티(Community), 마이페이지(MyPage) 5대 메뉴
   - 현재 활성 메뉴는 Forest Green 색상과 함께 상단 점(Dot) 또는 필(Pill)로 명확히 표시
4. **바텀 시트 (`MobileDrawer`)**:
   - 모바일 필터 및 설정 변경 시 팝업 대신 하단에서 부드럽게 올라오는 드로어 사용

---

## 🧩 6. 주요 기능별 컴포넌트 패턴

### 6.1 도서 카드 (Book Card)
- 세로 비율 유지 (표준 도서 비율 약 1:1.4)
- 표지 우측 상단에 카테고리 칩 또는 연령 뱃지 오버레이
- 도서명은 최대 2줄(`line-clamp-2`), 저자/출판사는 1줄(`truncate`)
- 소장 도서관 연동 시 `대출 가능` (에메랄드 뱃지) 실시간 상태 표시

### 6.2 AI 독서 솔루션 (Solution & Roadmap)
- 상단 요약 카드: `bg-emerald-50/60 border border-emerald-100`으로 AI 분석 신뢰감 제공
- 로드맵 주차별 카드: 파스텔톤 서클(주차 번호)과 단계별 체크리스트 아코디언 배치
- 레이더/카테고리 차트: 부드러운 그린 계열 단색 그라데이션 채우기

### 6.3 부모 보호 장치 (Parental Gate Modal)
- Google Play / Apple Families 정책 준수: 외부 링크 클릭 및 자녀 소셜 기능 전환 시 부모 확인용 덧셈 문제 또는 PIN 입력 모달 즉시 노출

### 6.4 로딩과 빈 상태 (Skeleton & EmptyState)
- **로딩 중**: 깜빡이는 회색 박스 대신, 실제 레이아웃과 100% 동일한 구조의 `SkeletonLoader` 펄스 애니메이션 노출
- **데이터 0건**: `EmptyState` 컴포넌트로 친근한 Lucide 아이콘, 안내 문구, 메인 액션 버튼(예: "첫 책 등록하기", "추천 도서 보러가기") 제공

---

## 🤖 7. AI 코딩 프롬프트 템플릿 (AI UI Prompting Tip)

AI에게 Book,ok 화면 코드를 요청할 때는 아래 문구를 함께 전달하세요:

> *"Book,ok 디자인 시스템을 엄격히 준수해줘. Pretendard 폰트, 한국어 keep-all 줄바꿈, 메인 컬러 #2E5A44(Forest Green), CTA 버튼 #16A34A를 적용해줘. 카드는 rounded-[32px]와 연한 border-gray-100 테두리, shadow-sm을 주고, 여백을 넉넉히 주어 신뢰감 있는 아동 교육 플랫폼 느낌을 유지해줘."*
