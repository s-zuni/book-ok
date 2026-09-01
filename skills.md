# 🧠 Book,ok AI Coding Skills & Anti-Spaghetti Guide

이 문서는 AI가 **Book,ok(우리 아이 맞춤 독서 플랫폼)** 코드베이스를 수정하거나 신규 기능을 구현할 때, **스파게티 코드를 원천 방지하고 일관된 아키텍처 품질을 유지**하기 위한 실무 가이드라인 및 전문 스킬북입니다.

---

## 📌 1. 서비스 도메인 지식 & 핵심 구조 이해

Book,ok은 단순한 도서 소개 사이트가 아니라 **"데이터 기반의 아동 독서 성장 솔루션"**입니다. 코드를 작성하기 전 다음 도메인 맥락을 반드시 숙지해야 합니다.

### 핵심 엔티티 관계도 (Core Data Models)
- **Profile (`profiles`)**: 부모(사용자) 프로필, 닉네임, 역할(`user` | `admin`), 자주 가는 도서관(`favorite_libraries` JSON), 부모 PIN/소셜 활성화 여부
- **Child (`children`)**: 자녀 프로필, 이름, 생년월일(`birthdate`), 성별, 독서 레벨, 부모 참조(`parent_id`)
- **Book (`books`)**: 마스터 도서 정보 (ISBN, 제목, 저자, 표지, 출판사, 카테고리, 목차, 줄거리)
- **ReadBook (`read_books`)**: 자녀별 독서 기록 (평점, 읽은 날짜, 완독 여부, 자녀 ID, 부모 ID)
- **ReadingGoal (`reading_goals`)**: 월별/연간 자녀 독서 목표 권수
- **Post & Comment (`posts`, `comments`)**: 커뮤니티 게시글 및 댓글 (공지사항 고정, 좋아요, 신고 연동)
- **Report (`reports`)**: 유해 게시글/댓글 신고 및 1:1 고객 문의

---

## 🏛️ 2. FSD 레이어별 코딩 원칙 (스파게티 방지)

```
[Layer 4: app/]       -> 라우팅 선언, 메타데이터, 레이아웃 조립만 수행 (비즈니스 로직 금지)
       ↓
[Layer 3: widgets/]   -> 여러 feature와 shared를 결합한 완성형 복합 UI 블록
       ↓
[Layer 2: features/]  -> 특정 도메인 단위 비즈니스 로직, 폼, 모달, 상태 컨텍스트
       ↓
[Layer 1: shared/]    -> 순수 UI 컴포넌트, 유틸, 타입, 공통 API (상위 레이어 역참조 절대 금지)
```

### ❌ 절대 하지 말아야 할 역방향 참조 (Anti-patterns)
- `shared/` 컴포넌트에서 `features/`나 `widgets/` 임포트 ➡️ **절대 금지 (순환 참조 원인)**
- `features/`에서 다른 도메인의 `features/`를 직접 수정하거나 깊게 결합 ➡️ **금지 (도메인 분리 붕괴)**
- `app/` 라우트 페이지 파일에 500줄 이상의 거대 상태 및 렌더링 로직 작성 ➡️ **금지 (widgets로 추출)**

---

## ⚔️ 3. 스파게티 코드 방지 10대 코딩 원칙 (The 10 Rules)

### 1. 단일 책임 & 300라인 분할 원칙 (Single Responsibility)
- 하나의 컴포넌트 파일이 300라인을 초과하기 시작하면 즉시 위험 신호입니다.
- **분리 기준**: 복잡한 테이블 뷰, 모달 팝업, 헤더 툴바, 서브 탭 콘텐츠는 별도의 하위 컴포넌트나 커스텀 훅(`useXxx`)으로 즉시 분리하십시오.

### 2. 상태의 지역화 원칙 (Colocation of State)
- 모든 상태를 최상위 전역 상태나 부모에 올리지 마십시오.
- 특정 모달이 닫히면 사라질 임시 입력값, 드롭다운 토글 상태 등은 **해당 UI 컴포넌트 내부의 로컬 `useState`로 캡슐화**하십시오.
- 전역 상태(`AuthContext`)는 인증 세션, 유저 프로필, 자녀 목록 등 **앱 전역에서 공유되어야 하는 데이터에만 한정**합니다.

### 3. Supabase 비동기 호출의 비동기 분리 (Decoupled Auth Operations)
- **🚨 치명적 버그 방지**: `supabase.auth.onAuthStateChange` 콜백 안에서 `await supabase.from(...)`을 직접 동기 호출하지 마십시오.
  ```typescript
  // ❌ BAD: SDK 락 데드락 유발 -> 모바일 앱 무한 스켈레톤 발생
  supabase.auth.onAuthStateChange(async (event, session) => {
    await fetchUserProfile(session.user.id);
  });

  // ✅ GOOD: 이벤트 루프를 분리하여 Auth 락 해제 후 실행
  supabase.auth.onAuthStateChange((event, session) => {
    setTimeout(async () => {
      await fetchUserProfile(session?.user?.id);
    }, 0);
  });
  ```

### 4. 모바일 WebView 타임아웃 방어 (Defensive Async)
- 모바일 기기는 절전 모드, 백그라운드 전환, 네트워크 지연이 빈번합니다.
- 데이터 조회 함수는 영원히 대기하지 않도록 **타임아웃 래퍼(`Promise.race` 또는 `withTimeout`)**를 적용하고, 타임아웃 시 Fallback 기본값을 즉시 반환하여 UI가 얼어붙지 않게 하십시오.

### 5. `any` 타입 사용 금지 (Strict Type Safety)
- `any` 타입을 남발하면 리팩터링 시 런타임 크래시가 발생합니다.
- 항상 `@shared/types`에 정의된 정규 인터페이스(`Book`, `Child`, `Profile`, `Post`)를 사용하고, API 응답 등 동적 데이터는 타입 가드나 Zod 스키마를 통해 검증하십시오.

### 6. 하이브리드 플랫폼 분기 철칙 (`Capacitor.isNativePlatform()`)
- 로컬 스토리지, 인앱 브라우저, 뒤로가기 버튼, 딥링크 처리 시 웹과 네이티브의 동작이 다릅니다:
  ```typescript
  import { Capacitor } from '@capacitor/core';

  if (Capacitor.isNativePlatform()) {
    // 네이티브 전용 플러그인 (@capacitor/preferences, @capacitor/browser 등)
  } else {
    // 웹 표준 API (window.location, localStorage 등)
  }
  ```

### 7. UI 로딩 & 빈 화면(Empty State) 필수 처리
- 데이터를 불러오는 모든 컴포넌트는 다음 3단계를 명시적으로 구현해야 합니다:
  1. `isLoading`: [`SkeletonLoader`](src/shared/ui/SkeletonLoader.tsx)를 통한 부드러운 플레이스홀더 제공
  2. `isError`: 사용자 친화적 에러 메시지 및 재시도 버튼 제공
  3. `isEmpty`: 데이터가 0건일 때 [`EmptyState`](src/shared/ui/EmptyState.tsx) 안내 화면 제공

### 8. 하드코딩 상수 배제 (DRY & Constants)
- 지역 코드, 카테고리 목록, 기본 이미지 URL, 스토리지 키 등은 인라인 문자열로 적지 말고 [`@shared/lib/constants.ts`](src/shared/lib/constants.ts) 또는 [`@shared/lib/regions.ts`](src/shared/lib/regions.ts)에서 가져와 사용하십시오.

### 9. Side-Effect(`useEffect`) 클린업 준수
- 비동기 데이터 페칭 Effect에는 반드시 언마운트 취소 플래그(`cancelled` 또는 `AbortController`)를 두어 메모리 누수와 비동기 상태 덮어쓰기 레이스 컨디션을 방지하십시오.
  ```typescript
  useEffect(() => {
    let isMounted = true;
    async function load() {
      const data = await fetchData();
      if (isMounted) setState(data);
    }
    load();
    return () => { isMounted = false; };
  }, [dependency]);
  ```

### 10. 디자인 시스템 규격 준수 (Design Consistency)
- 임의의 색상 코드(예: `#348211`, `#112233`)를 코드 곳곳에 산재시키지 마십시오.
- [`docs/Design.md`](docs/Design.md)에 지정된 테마 색상(Forest Green `#2E5A44`, Brand Green `#16A34A`, Gold Highlight `#FACC15`)과 Tailwind 클래스를 일관되게 사용하십시오.

---

## 🎯 4. AI 작업 완료 전 필수 검증 체크리스트

코드를 작성하거나 수정한 후, 다음 항목을 스스로 확인하십시오:

- [ ] `npm run typecheck` 실행 시 타입 에러가 0건인가?
- [ ] 신규 파일이 적절한 레이어(`shared/`, `features/`, `widgets/`, `docs/`)에 배치되었는가?
- [ ] 모바일 앱 환경에서 화면이 무한 스켈레톤 상태에 갇힐 가능성이 없는가?
- [ ] 민감한 API Key나 Service Role Key가 클라이언트 코드에 노출되지 않았는가?
- [ ] 모바일 상하단 Safe Area와 터치 반응성이 자연스러운가?
