import { Child } from '@shared/types';
import { getInterestTopic, parseInterestIds } from './interestTopics';

export interface CustomRecommendationParams {
    query: string;
    categoryId: string;
    sort: 'SalesPoint' | 'PublishTime';
    apiType: string;
    headline: string;
    subHeadline: string;
}

/** 연령 구간 라벨(검색어에 붙여 사용) */
export function getAgeGroupLabel(child?: Child | null): string {
    if (!child) return '어린이';
    const age = child.age || 0;
    if (age < 7 || child.type === '유아' || child.type === '영아') return '유아';
    if ((age >= 7 && age <= 9) || child.type === '초등저학년') return '초등 저학년';
    if (age >= 10 || child.type === '초등고학년') return '초등 고학년';
    return '어린이';
}

/**
 * Generates optimal book recommendation parameters based on child's age, gender, and preferred topics
 */
export function getChildRecommendationParams(
    child?: Child | null,
    sortType: 'popular' | 'latest' = 'popular'
): CustomRecommendationParams {
    const sort = sortType === 'popular' ? 'SalesPoint' : 'PublishTime';

    if (!child) {
        return {
            query: '어린이 베스트셀러',
            categoryId: '001001016', // 어린이
            sort,
            apiType: 'ItemSearch',
            headline: '우리 아이 맞춤 추천도서',
            subHeadline: '자녀 프로필을 등록하면 딱 맞는 도서를 추천해드려요'
        };
    }

    const age = child.age || 0;
    const isToddler = age < 7 || child.type === '유아' || child.type === '영아';
    const childAgeText = getAgeGroupLabel(child);

    // Case 1: 관심사가 설정된 경우 (첫 번째 관심사 기준 검색 — 홈의 탭형 추천은 interestPicks 사용)
    const interestId = parseInterestIds(child.preferred_topics)[0];
    if (interestId) {
        const topic = getInterestTopic(interestId)!;
        const interestLabels = parseInterestIds(child.preferred_topics).map(id => getInterestTopic(id)!.label).join(', ');
        return {
            query: `${childAgeText} ${topic.label}`,
            categoryId: isToddler ? '001001027' : '001001016',
            sort,
            apiType: 'ItemSearch',
            headline: `${child.name} 맞춤 추천도서`,
            subHeadline: `${childAgeText} · ${interestLabels} 관심사 반영 큐레이션`
        };
    }

    // Case 2: Child has NO preferred topics
    const genderQueryPrefix = child.gender === '남아' ? '남아 인기' : child.gender === '여아' ? '여아 인기' : '인기';
    const categoryId = isToddler ? '001001027' : '001001016';
    const query = isToddler 
        ? '유아 그림책 베스트셀러' 
        : `${childAgeText} ${genderQueryPrefix} 도서`;

    return {
        query,
        categoryId,
        sort,
        apiType: 'ItemSearch',
        headline: `${child.name} 맞춤 추천도서`,
        subHeadline: `도서관 대출 데이터 기반 ${childAgeText} 인기 도서`
    };
}
