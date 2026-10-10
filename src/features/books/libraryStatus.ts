import type { LibraryStatusDetail } from './LibraryDetailModal';

export type LoanState = 'available' | 'unavailable' | 'none';

/** 도서관별 소장·대출 상태 → 화면 표시용 3단계 */
export function getLoanState(status: Pick<LibraryStatusDetail, 'hasBook' | 'loanAvailable'>): LoanState {
    if (status.hasBook !== 'Y') return 'none';
    return status.loanAvailable === 'Y' ? 'available' : 'unavailable';
}

export const LOAN_STATE_META: Record<LoanState, { label: string; text: string; dot: string; badge: string }> = {
    available: { label: '대출 가능', text: 'text-[#01AB44]', dot: 'bg-[#01AB44]', badge: 'bg-[#01AB44]' },
    unavailable: { label: '대출 불가', text: 'text-[#FF3939]', dot: 'bg-[#FF3939]', badge: 'bg-[#FF3939]' },
    none: { label: '미 소장', text: 'text-[#767676]', dot: 'bg-[#767676]', badge: 'bg-[#767676]' },
};

/** 등록한 도서관 전체를 요약한 대표 상태: 하나라도 대출 가능하면 가능, 소장만 있으면 불가, 전부 미소장이면 미 소장 */
export function summarizeLoanState(statuses: readonly LibraryStatusDetail[]): LoanState | null {
    if (statuses.length === 0) return null;
    const states = statuses.map(getLoanState);
    if (states.includes('available')) return 'available';
    return states.includes('unavailable') ? 'unavailable' : 'none';
}
