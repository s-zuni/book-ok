export const MENU_CONFIG = {
    intro: { label: '북콕 소개', sub: ['북콕 서비스', '북콕 비전'] },
    rec: { label: '도서 추천', sub: ['사서 추천', '연령별 추천 도서', '수상 도서작', '기타 자료실'] },
    solution: { label: 'AI 독서 솔루션', sub: ['우리 아이 독서 성향 AI 분석', 'AI 독서 솔루션'] },
    comm: { label: '커뮤니티', sub: ['전체 게시글', '인기 게시판', '유아동 독서 고민', '유아동 교육 고민'] }
} as const;

export const RECOMMENDATION_TABS: Record<string, { label: string; query: string; categoryId?: string; apiType?: string; queryType?: string }[]> = {
    '사서 추천': [
        { label: '전체', query: '', categoryId: '1108', apiType: 'ItemList', queryType: 'ItemEditorChoice' },
        { label: '국립중앙도서관', query: '국립중앙도서관' },
        { label: '학교도서관저널', query: '학교도서관저널' },
        { label: '서울시교육청', query: '서울시교육청' },
        { label: '국립어린이청소년도서관', query: '국립어린이청소년도서관', categoryId: '1108' }
    ],
    '연령별 매칭 도서': [
        { label: '0~3세', query: '', categoryId: '35088', apiType: 'ItemList', queryType: 'Bestseller' },
        { label: '3~6세', query: '', categoryId: '35106', apiType: 'ItemList', queryType: 'Bestseller' },
        { label: '초등 저학년', query: '', categoryId: '48803', apiType: 'ItemList', queryType: 'Bestseller' },
        { label: '초등 고학년', query: '', categoryId: '48804', apiType: 'ItemList', queryType: 'Bestseller' }
    ],
    '수상 도서작': [
        { label: '전체', query: '문학상', apiType: 'ItemSearch' },
        { label: '칼데콧상', query: '칼데콧', apiType: 'ItemSearch' },
        { label: '뉴베리상', query: '뉴베리', apiType: 'ItemSearch' },
        { label: '볼로냐 라가치상', query: '볼로냐라가치', apiType: 'ItemSearch' },
        { label: '안데르센상', query: '안데르센', apiType: 'ItemSearch' },
        { label: '방정환문학상', query: '방정환문학상', apiType: 'ItemSearch' }
    ],
    '아이 맞춤 추천 도서': [
        { label: '전체 (맞춤)', query: '어린이 베스트셀러', categoryId: '1108', apiType: 'ItemSearch' },
        { label: '그림책 · 동화', query: '창작그림책', categoryId: '1108', apiType: 'ItemSearch' },
        { label: '자연 · 과학', query: '어린이 과학 자연', categoryId: '1137', apiType: 'ItemSearch' },
        { label: '역사 · 사회', query: '어린이 역사 인물', categoryId: '1109', apiType: 'ItemSearch' },
        { label: '수학 · 논리', query: '어린이 수학 퍼즐', categoryId: '1175', apiType: 'ItemSearch' },
        { label: '예술 · 체육', query: '어린이 예술 미술', categoryId: '1177', apiType: 'ItemSearch' },
        { label: '인성 · 마음', query: '어린이 인성 생활습관', categoryId: '1132', apiType: 'ItemSearch' },
        { label: '언어 · 한글', query: '어린이 한글 말놀이', categoryId: '13790', apiType: 'ItemSearch' },
        { label: '학습만화', query: '어린이 학습만화', categoryId: '1110', apiType: 'ItemSearch' }
    ]
};
