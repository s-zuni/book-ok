# Book,ok Design System & UX/UI Guidelines

이 문서는 **Book,ok(우리 아이 맞춤 독서 플랫폼)**의 시각적 언어와 사용자 경험 원칙을 정의합니다. AI가 이 문서를 바탕으로 일관된 UI를 재현하고 새로운 화면을 설계할 수 있도록 구성되었습니다.

---

## 1. 핵심 브랜드 아이덴티티 (Core Identity)

- **브랜드명**: Book,ok (우리 아이 맞춤 독서 플랫폼)
- **핵심 키워드**: 프리미엄, 신뢰감, 아동 친화적(Sophisticated Child-friendly), 깔끔함, 역동성.
- **디자인 철학**: 복잡한 요소를 배제하고, 여백과 타이포그래피, 부드러운 곡선을 통해 신뢰감 있는 교육 서비스 느낌을 전달합니다.

---

## 2. 컬러 팔레트 (Color Palette)

| 구분 | 색상 코드 | 용도 |
| :--- | :--- | :--- |
| **Primary (Forest)** | `#2E5A44` | 메인 브랜드 컬러, 제목, 포인트 요소 |
| **Secondary (Green)** | `#16A34A` | CTA 버튼, 활성화 상태, 성공 메시지 |
| **Highlight (Yellow)** | `#FACC15` | 수상 내역, 뱃지, 강조 아이콘 |
| **Background** | `#FDFDFD` | 전체 페이지 배경 (순백색보다 부드러운 느낌) |
| **Surface** | `#FFFFFF` | 카드, 입력창 배경 |
| **Sub-Surface** | `#F9FAFB` | 섹션 구분, 비활성 버튼 배경 |
| **Text (Main)** | `#1A1A1A` | 본문 및 제목 텍스트 |
| **Text (Sub)** | `#6B7280` | 부연 설명, 메타 정보 |
| **Border** | `#F3F4F6` | 카드 테두리, 구분선 |

---

## 3. 타이포그래피 (Typography)

- **Font Family**: `Pretendard Variable`, sans-serif
- **최적화 설정**:
  - `letter-spacing: -0.01em` (본문) / `-0.02em` (제목)
  - `word-break: keep-all` (한국어 가독성 핵심)
  - `line-height: 1.6` (본문 가독성 확보)
- **계층 구조**:
  - **H1 (Hero)**: `text-4xl` to `text-6xl`, `font-black`, `tracking-tighter`
  - **H2 (Section)**: `text-2xl` to `text-3xl`, `font-black`
  - **Body**: `text-base`, `font-medium` or `font-regular`

---

## 4. UI 구성 요소 원칙 (Component Principles)

### 4.1 카드 디자인 (Cards)
- **곡률 (Radius)**: 매우 큰 라운드 값 사용 (`rounded-[40px]` 또는 `rounded-[2.5rem]`).
- **그림자 (Shadow)**: 매우 은은한 그림자 (`shadow-[0_4px_20px_rgba(0,0,0,0.04)]`).
- **상호작용**: 호버 시 살짝 떠오르거나 테두리 색상이 변경되는 효과 (`duration-500`).

### 4.2 버튼 (Buttons)
- **기본**: `rounded-full` 또는 `rounded-2xl`.
- **CTA**: 배경색 `#16A34A`, 텍스트 흰색, `font-bold`.
- **Ghost**: 테두리만 있거나 배경이 아주 연한 스타일.

### 4.3 입력창 (Inputs)
- **스타일**: `bg-gray-50`, `border-none`, `focus:ring-2 focus:ring-[#2E5A44]`.
- **Placeholder**: `text-gray-400`.

---

## 5. 주요 기능별 UX 설계 (Feature UX)

### 5.1 AI 솔루션 (AI Solutions)
- **레이아웃**: 2컬럼 그리드 (좌측: 입력/결과 60%, 우측: 가이드/신뢰뱃지 40%).
- **로딩**: `LoadingState`를 통해 "AI가 분석 중입니다" 등의 메시지를 순차적으로 노출하여 대기 시간을 긍정적으로 전환.
- **결과 노출**: `bg-green-50/50` 배경의 카드 안에 `prose` 스타일로 가독성 있게 렌더링.
- **독서 로드맵**: `bg-linear-to-br from-indigo-50 to-purple-50` 그라데이션 배경 사용. 주차별 계획은 아코디언 형태로 구성하며, 각 주차는 고유의 색상(Blue, Green, Orange, Purple) 서클 아이콘으로 구분.
- **관찰 입력**: `bg-blue-50` 배경의 접이식 섹션을 사용하여 정밀 분석 유도.

### 5.2 커뮤니티 (Community)
- **리스트**: 게시글 간 넓은 간격(`pb-8`), 하단 경계선(`border-b`).
- **메타 정보**: 작성자 닉네임 옆 작은 원형 프로필, 작성일, 조회수/좋아요 아이콘 조합.
- **공지사항**: `NOTICE` 뱃지와 함께 에메랄드 톤 강조 컬러 사용 (`bg-emerald-50`, `text-emerald-700`).

### 5.3 도서 추천 (Recommendations)
- **그리드**: `md:grid-cols-3` 또는 `grid-cols-4` 형태의 도서 카드 배열.
- **필터**: 탭(`tabs`) 형태의 카테고리 전환 및 우측 상단 정렬(최신순/인기순) 토글.
- **이미지**: 도서 표지는 `rounded-xl`과 미세한 테두리(`border-gray-100`)로 선명하게 부각.
- **빈 상태 (Empty State)**: `EmptyState` 컴포넌트를 사용하여 큰 아이콘과 함께 명확한 행동 유도 버튼(Action Button) 제공.

---

## 6. 인터랙션 및 애니메이션 (Motion)

- **Fade-in**: 페이지 및 섹션 전환 시 `animate-in fade-in duration-700` 사용.
- **Micro-interactions**: 
  - 아이콘 호버 시 살짝 회전 및 확대 (`scale-110 rotate-3`).
  - 버튼 클릭 시 미세한 스케일 다운 효과.
- **Mobile UX**: 하단 고정 네비게이션(`MobileBottomNav`)을 통해 주요 메뉴(홈, 솔루션, 커뮤니티, 마이페이지)에 즉시 접근 가능.

---

## 7. AI 재현 가이드 (AI Prompting Tip)

"Book,ok 스타일로 만들어줘"라고 요청할 때 다음 지침을 포함하세요:
> "Pretendard 폰트와 #2E5A44(Forest Green) 메인 컬러를 사용해. 모든 카드는 rounded-[40px]로 둥글게 만들고, 아주 연한 그림자를 줘. 한국어 텍스트는 word-break: keep-all을 적용해서 가독성을 높여줘. 전체적으로 여백을 넉넉히 사용해서 프리미엄한 교육 서비스 느낌이 나도록 해."
