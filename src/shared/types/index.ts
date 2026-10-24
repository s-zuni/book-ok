export type MainMenu = 'intro' | 'rec' | 'solution' | 'comm';

export type ViewState = 'main' | 'search' | 'detail' | 'mypage' | 'write' | 'post-detail' | 'auth';

export interface Book {
    id: string;
    bookid: string;
    title: string;
    author: string;
    imgsrc: string;
    category: string;
    pubDate?: string;
    description?: string;
    toc?: string;
    publisher?: string;
    rating?: number;
    reviewsCount?: number;
    coverUrl?: string;
    /** 예스24 상품 상세페이지 구매 링크(애드온 링크 포함) */
    purchaseUrl?: string;
}

export interface Review {
    id: number;
    book_id: string | number;
    user_id: string;
    rating: number;
    review_text: string;
    created_at: string;
    profiles: {
        nickname: string;
    }
}

export interface Post {
    id: number;
    category: string;
    title: string;
    content: string;
    author_nickname: string;
    user_id: string;
    views: number;
    likes: number;
    created_at: string;
    image_url?: string;
    is_notice: boolean;
    is_deleted: boolean;
    comments?: { count: number }[];
}

export interface Comment {
    id: number;
    post_id: number;
    author_name: string;
    content: string;
    user_id: string;
    created_at: string;
    parent_id?: number | null;
    is_deleted: boolean;
}

export interface Child {
    id: string;
    name: string;
    age: number;
    type: string;
    parent_id: string;
    birthdate: string;
    gender?: string;
    preferred_topics?: string[];
}

export interface ReadBook {
    id: number;
    user_id: string;
    child_id: string;
    book_id: string;
    read_date: string;
    rating?: number; // 1-5 별점
    difficulty_rating?: '쉬움' | '적당' | '어려움'; // 난이도
    reading_time_minutes?: number; // 독서 시간 (분)
    observation_data?: Record<string, string>; // 관찰 데이터
    books?: Book; // Joined book data
}

export interface ReadingGoal {
    id: string;
    user_id: string;
    child_id: string;
    goal_type: 'weekly' | 'monthly';
    target_books: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Profile {
    id: string;
    nickname: string;
    role: 'parent' | 'children' | 'user';
    is_admin: boolean;
    phone?: string;
    email?: string;
    is_active?: boolean;
    created_at: string;
    eula_agreed_at?: string;
    favorite_libraries?: Array<{ libCode: string; libName: string }>;
}

export interface Popup {
    id: string;
    title: string;
    content: string;
    image_url?: string;
    link_url?: string;
    is_active: boolean;
    expires_at?: string;
    created_at: string;
}

export interface BookScrap {
    id: string;
    user_id: string;
    book_id?: number | null;
    isbn: string;
    title: string;
    author?: string;
    imgsrc?: string;
    category?: string;
    created_at: string;
}

export interface Report {
    id: string;
    user_id: string;
    type: 'report' | 'inquiry';
    title: string;
    content: string;
    target_type?: 'post' | 'comment' | 'book' | 'other';
    target_id?: string;
    status: 'pending' | 'resolved' | 'rejected';
    reply_content?: string;
    created_at: string;
    updated_at: string;
    profiles?: {
        nickname: string;
        email: string;
    };
}

export type LiteracyArea = 'vocabulary' | 'factual' | 'inferential' | 'critical';

export interface LiteracyVocabularyItem {
    word: string;
    meaning: string;
    level: string;
}

export interface LiteracyPassage {
    id: string;
    title: string;
    content: string;
    grade_level: number; // 0: 유아(5~6세), 1~6: 초등 1~6학년
    grade_label?: string;
    genre: string;
    interest_tags?: string[];
    word_count: number;
    char_count: number;
    source_attribution?: string;
    key_vocabularies?: LiteracyVocabularyItem[];
    norm_wpm?: number;
}

export interface LiteracyQuestion {
    id: string;
    passage_id: string;
    area: LiteracyArea;
    question: string;
    options: string[];
    // 시작 시점에는 내려오지 않고, 채점 결과(LiteracyGradedAnswer)로만 공개된다
    correct_answer?: number;
    evidence?: string;
    explanation?: string;
    critic_score?: number;
}

export interface LiteracyGradedAnswer {
    question_id: string;
    area: LiteracyArea;
    area_label: string;
    question: string;
    options: string[];
    /** 응시자에게 보인(섞인) 보기 기준 인덱스. 미응답/모르겠어요는 -1 */
    selected: number;
    /** 섞인 보기 기준 정답 인덱스 */
    correct_answer: number;
    is_correct: boolean;
    unsure?: boolean;
    evidence: string;
    explanation: string;
    time_spent_sec: number;
}

export interface LiteracyPrescribedBook extends Book {
    prescriptionArea?: string;
    prescriptionReason?: string;
    prescriptionKeyword?: string;
}

export interface LiteracyAssessment {
    id: string;
    user_id?: string;
    child_id?: string | number;
    passage_id: string;
    passage_title?: string;
    passage_content?: string;
    passage_genre?: string;
    word_count?: number;
    grade_level: number;
    grade_label?: string;
    norm_wpm?: number;
    reading_time_seconds: number;
    raw_wpm: number;
    effective_wpm: number;
    score_vocabulary: number;
    score_factual: number;
    score_inferential: number;
    score_critical: number;
    /** 읽기 속도 참고 점수(권장 속도 대비 %). 유아·비정상 속도는 null(미산정) */
    score_fluency: number | null;
    fluency_reason?: "ok" | "toddler" | "too_fast";
    /** 2: 정답 비율 기반(이해 4영역 평균). 1(또는 없음): 이전 방식 */
    scoring_version?: number;
    /** 서버에 저장되었는지 (게스트·자녀 미선택·저장 실패는 false) */
    saved?: boolean;
    save_status?: "saved" | "guest" | "no_child" | "failed";
    total_bli_score: number;
    bli_tier: string;
    weakest_area: string;
    weakest_area_label?: string;
    strength_area: string;
    strength_area_label?: string;
    ai_diagnosis_summary: string;
    coaching_tip?: string;
    answers: LiteracyGradedAnswer[];
    prescribed_keywords: string[];
    prescribed_books: LiteracyPrescribedBook[];
    created_at: string;
}



