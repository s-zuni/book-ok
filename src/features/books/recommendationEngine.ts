import { Child } from '@shared/types';

export interface TopicCategoryConfig {
    id: string;
    label: string;
    icon: string;
    categoryId: string;
    query: string;
    kdc: string;
    description: string;
}

export const ALADIN_TOPIC_CATEGORIES: TopicCategoryConfig[] = [
    {
        id: 'picture_book',
        label: '그림책 · 창작동화',
        icon: '🎨',
        categoryId: '1108',
        query: '창작그림책',
        kdc: '8',
        description: '상상력과 감성을 키우는 이야기'
    },
    {
        id: 'science_nature',
        label: '자연 · 과학 · 동식물',
        icon: '🦖',
        categoryId: '1137',
        query: '어린이 과학 자연',
        kdc: '4',
        description: '동물, 곤충, 공룡, 우주와 과학 탐구'
    },
    {
        id: 'history_society',
        label: '역사 · 인물 · 사회',
        icon: '👑',
        categoryId: '1109',
        query: '어린이 역사 인물',
        kdc: '9',
        description: '위인전, 역사 이야기와 사회 탐구'
    },
    {
        id: 'math_logic',
        label: '수학 · 논리 · 두뇌계발',
        icon: '💡',
        categoryId: '1175',
        query: '어린이 수학 퍼즐',
        kdc: '4',
        description: '수학동화, 퀴즈와 퍼즐, 생각하는 힘'
    },
    {
        id: 'art_sports',
        label: '예술 · 체육 · 음악',
        icon: '🎭',
        categoryId: '1177',
        query: '어린이 예술 미술',
        kdc: '6',
        description: '미술, 음악, 만들기, 체육 놀이'
    },
    {
        id: 'mind_habit',
        label: '인성 · 마음 · 생활습관',
        icon: '💖',
        categoryId: '1132',
        query: '어린이 인성 생활습관',
        kdc: '1',
        description: '올바른 생활습관, 감정표현, 친구관계'
    },
    {
        id: 'language_english',
        label: '언어 · 한글 · 영어',
        icon: '🔤',
        categoryId: '13790',
        query: '어린이 한글 말놀이',
        kdc: '7',
        description: '말놀이, 한글 배우기, 첫 영어'
    },
    {
        id: 'learning_comic',
        label: '학습만화 · 모험교양',
        icon: '🚀',
        categoryId: '1110',
        query: '어린이 학습만화',
        kdc: '0',
        description: '신나는 모험과 흥미진진한 지식 만화'
    }
];

export interface CustomRecommendationParams {
    query: string;
    categoryId: string;
    sort: 'SalesPoint' | 'PublishTime';
    apiType: string;
    headline: string;
    subHeadline: string;
}

/**
 * Generates optimal Aladin API parameters based on child's age, gender, and preferred topics
 */
export function getChildRecommendationParams(
    child?: Child | null,
    sortType: 'popular' | 'latest' = 'popular'
): CustomRecommendationParams {
    const aladinSort = sortType === 'popular' ? 'SalesPoint' : 'PublishTime';

    if (!child) {
        return {
            query: '어린이 베스트셀러',
            categoryId: '1108',
            sort: aladinSort,
            apiType: 'ItemSearch',
            headline: '우리 아이 맞춤 추천도서',
            subHeadline: '자녀 프로필을 등록하면 딱 맞는 도서를 추천해드려요'
        };
    }

    const age = child.age || 0;
    const isToddler = age < 7 || child.type === '유아' || child.type === '영아';
    const isEarlyElem = (age >= 7 && age <= 9) || child.type === '초등저학년';
    const isLateElem = age >= 10 || child.type === '초등고학년';

    const childAgeText = isToddler ? '유아' : isEarlyElem ? '초등 저학년' : isLateElem ? '초등 고학년' : '어린이';
    const topics = child.preferred_topics || [];

    // Case 1: Child has preferred topics
    if (topics.length > 0) {
        // Find matching topic config for the first selected topic
        const matchedTopic = ALADIN_TOPIC_CATEGORIES.find(t => topics.includes(t.label) || topics.includes(t.id));
        const primaryTopicName = matchedTopic ? matchedTopic.label.split(' · ')[0] : topics[0];
        const categoryId = matchedTopic ? matchedTopic.categoryId : (isToddler ? '13789' : '1108');
        
        let query = `${childAgeText} ${primaryTopicName}`;
        if (matchedTopic?.query) {
            query = `${childAgeText} ${matchedTopic.query}`;
        }

        const topicsLabel = topics.slice(0, 2).map(t => t.split(' · ')[0]).join(', ');

        return {
            query,
            categoryId,
            sort: aladinSort,
            apiType: 'ItemSearch',
            headline: `${child.name} 맞춤 추천도서`,
            subHeadline: `${childAgeText} · ${topicsLabel} 선호 반영 큐레이션`
        };
    }

    // Case 2: Child has NO preferred topics (Use age & gender popular loans)
    const genderQueryPrefix = child.gender === '남아' ? '남아 인기' : child.gender === '여아' ? '여아 인기' : '인기';
    const categoryId = isToddler ? '13789' : '1108';
    const query = isToddler 
        ? '유아 그림책 베스트셀러' 
        : `${childAgeText} ${genderQueryPrefix} 도서`;

    return {
        query,
        categoryId,
        sort: aladinSort,
        apiType: 'ItemSearch',
        headline: `${child.name} 맞춤 추천도서`,
        subHeadline: `도서관 대출 데이터 기반 ${childAgeText} 인기 도서`
    };
}

