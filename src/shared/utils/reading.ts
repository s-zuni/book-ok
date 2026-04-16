
export const getAgeGroupQuestions = (age: number) => {
    if (age < 5) {
        return [
            { id: 'interest', label: '아이가 그림이나 소리에 반응했나요?', placeholder: '예: 그림을 짚으며 옹알이를 했습니다.' },
            { id: 'interaction', label: '책을 읽어줄 때 상호작용은 어땠나요?', placeholder: '예: 페이지를 직접 넘기려고 했습니다.' }
        ];
    } else if (age >= 5 && age < 7) {
        return [
            { id: 'decoding', label: '글자를 소리내어 읽을 수 있었나요?', placeholder: '예: 받침 없는 글자는 읽었습니다.' },
            { id: 'phonics', label: '발음이 명확했나요?', placeholder: '예: ㄹ 발음을 어려워했습니다.' }
        ];
    } else if (age >= 7 && age < 9) { // 전환기 (핵심)
        return [
            { id: 'fluency', label: '책을 끊김 없이 술술 읽었나요? (유창성)', placeholder: '예: 아직 떠듬떠듬 읽는 편입니다.' },
            { id: 'independence', label: '혼자서 끝까지 읽었나요?', placeholder: '예: 20페이지 정도는 혼자 읽었습니다.' }
        ];
    } else if (age >= 9 && age < 12) {
        return [
            { id: 'critical', label: '책 내용에 대해 질문했나요?', placeholder: '예: 주인공의 행동이 이해 안 간다고 말했습니다.' },
            { id: 'vocabulary', label: '모르는 단어를 물어보았나요?', placeholder: '예: 추상적인 어휘를 물어봤습니다.' }
        ];
    } else {
        return [
            { id: 'advanced', label: '책을 읽고 감상평을 말했나요?', placeholder: '예: 독후감을 짧게 썼습니다.' },
            { id: 'preference', label: '이 책을 특별히 좋아했나요?', placeholder: '예: 판타지 소설이라 좋아했습니다.' }
        ];
    }
};
