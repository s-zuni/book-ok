/**
 * 대한민국 표준 만 나이 및 연령 그룹 계산 유틸리티
 */

/**
 * 생년월일 기준 정확한 만 나이를 계산합니다.
 * (현재 날짜가 생일을 지났는지 월/일 단위까지 정확히 판별)
 */
export function calculateExactAge(birthdate: string | Date | null | undefined): number {
    if (!birthdate) return 0;
    const birth = new Date(birthdate);
    if (isNaN(birth.getTime())) return 0;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return Math.max(0, age);
}

export type ChildAgeGroup = '영아' | '유아' | '초등 저학년' | '초등 고학년' | '청소년';

/**
 * 만 나이 기준 통일된 연령대 분류
 * - 0~2세: 영아
 * - 3~6세: 유아
 * - 7~9세(초1~3): 초등 저학년
 * - 10~12세(초4~6): 초등 고학년
 * - 13세 이상: 청소년
 */
export function getChildAgeGroup(age: number): ChildAgeGroup {
    if (age <= 2) return '영아';
    if (age <= 6) return '유아';
    if (age <= 9) return '초등 저학년';
    if (age <= 12) return '초등 고학년';
    return '청소년';
}

/**
 * 만 나이 라벨 포맷터 ("만 N세")
 */
export function formatAgeText(birthdate: string | Date | null | undefined): string {
    const age = calculateExactAge(birthdate);
    return `만 ${age}세`;
}
