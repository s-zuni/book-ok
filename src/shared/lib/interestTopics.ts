import { Bug, PawPrint, Users, Heart, Smile, Compass, FlaskConical, School, Briefcase, type LucideIcon } from 'lucide-react';

export const MAX_INTERESTS = 3;

export interface InterestTopic {
    id: string;
    label: string;
    Icon: LucideIcon;
}

/** 관심사 9종. `children.preferred_topics` 에는 id 만 저장하고, 서버(recommendations)가 id 별 검색어·키워드를 가집니다. */
export const INTEREST_TOPICS: readonly InterestTopic[] = [
    { id: 'insect', label: '곤충', Icon: Bug },
    { id: 'animal', label: '동물', Icon: PawPrint },
    { id: 'friendship', label: '우정', Icon: Users },
    { id: 'family', label: '가족', Icon: Heart },
    { id: 'emotion', label: '감정', Icon: Smile },
    { id: 'adventure', label: '모험', Icon: Compass },
    { id: 'science', label: '과학', Icon: FlaskConical },
    { id: 'school', label: '학교생활', Icon: School },
    { id: 'career', label: '진로', Icon: Briefcase },
];

const TOPIC_BY_ID = new Map(INTEREST_TOPICS.map(t => [t.id, t]));

export const getInterestTopic = (id: string) => TOPIC_BY_ID.get(id);

/** 저장값에서 유효한 관심사 id 만 추려냅니다(과거 온보딩의 라벨 문자열 등은 무시). */
export function parseInterestIds(raw?: readonly string[] | null): string[] {
    if (!raw?.length) return [];
    return Array.from(new Set(raw.filter(id => TOPIC_BY_ID.has(id)))).slice(0, MAX_INTERESTS);
}
