export const MENU_CONFIG = {
    intro: { label: '북콕 소개', sub: ['북콕 서비스', '북콕 비전'] },
    rec: { label: '도서 추천', sub: ['2025 사서 추천', '전문가 추천', '수상 도서작', '기타 자료실'] },
    solution: { label: 'AI 독서 솔루션', sub: ['우리 아이 독서 성향 AI 분석', 'AI 독서 솔루션'] },
    comm: { label: '커뮤니티', sub: ['전체 게시글', '인기 게시판', '유아동 독서 고민', '유아동 교육 고민'] }
} as const;

export const RECOMMENDATION_TABS: Record<string, { label: string; query: string }[]> = {
    '2025 사서 추천': [
        { label: '전체', query: '사서추천' },
        { label: '국립중앙도서관', query: '국립중앙도서관 사서추천' },
        { label: '학교도서관저널', query: '학교도서관저널 추천' },
        { label: '서울시교육청', query: '서울시교육청 추천도서' },
        { label: '국립어린이청소년도서관', query: '국립어린이청소년도서관 추천' }
    ],
    '전문가 추천': [
        { label: '전체', query: '전문가추천' },
        { label: '북스타트', query: '북스타트' },
        { label: '아침독서', query: '아침독서 추천' },
        { label: '어린이도서연구회', query: '어린이도서연구회' },
        { label: '행복한아침독서', query: '행복한아침독서 추천' }
    ],
    '수상 도서작': [
        { label: '전체', query: '수상작' },
        { label: '칼데콧상', query: '칼데콧상' },
        { label: '뉴베리상', query: '뉴베리상' },
        { label: '볼로냐 라가치상', query: '볼로냐 라가치상' },
        { label: '안데르센상', query: '안데르센상' },
        { label: '한국 그림책상', query: '한국그림책상' }
    ]
};
