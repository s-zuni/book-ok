export const MENU_CONFIG = {
    intro: { label: '북콕 소개', sub: ['북콕 서비스', '북콕 비전'] },
    rec: { label: '도서 추천', sub: ['2025 사서 추천', '연령별 추천 도서', '수상 도서작', '기타 자료실'] },
    solution: { label: 'AI 독서 솔루션', sub: ['우리 아이 독서 성향 AI 분석', 'AI 독서 솔루션'] },
    comm: { label: '커뮤니티', sub: ['전체 게시글', '인기 게시판', '유아동 독서 고민', '유아동 교육 고민'] }
} as const;

export const RECOMMENDATION_TABS: Record<string, { label: string; query: string; categoryId?: string }[]> = {
    '2025 사서 추천': [
        { label: '전체', query: '사서추천' },
        { label: '국립중앙도서관', query: '국립중앙도서관' },
        { label: '학교도서관저널', query: '학교도서관저널' },
        { label: '서울시교육청', query: '서울시교육청' },
        { label: '국립어린이청소년도서관', query: '국립어린이청소년도서관' }
    ],
    '연령별 추천 도서': [
        { label: '영유아 (0-4세)', query: '0-4세', categoryId: '4123' },
        { label: '유치 (5-7세)', query: '5-7세', categoryId: '4123' },
        { label: '초등 저학년 (8-10세)', query: '초등1-2학년', categoryId: '1108' },
        { label: '초등 고학년 (11-13세)', query: '초등3-6학년', categoryId: '1108' }
    ],
    '수상 도서작': [
        { label: '전체', query: '문학상' },
        { label: '칼데콧상', query: '칼데콧상' },
        { label: '뉴베리상', query: '뉴베리상' },
        { label: '볼로냐 라가치상', query: '볼로냐 라가치상' },
        { label: '안데르센상', query: '안데르센상' },
        { label: '한국 그림책상', query: '한국그림책상' }
    ]
};
