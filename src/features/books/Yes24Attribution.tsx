/** 도서 정보가 노출되는 화면에 표기하는 출처 및 제휴 안내 (예스24 Open API 이용약관 제6조 ③ 4호) */
export default function Yes24Attribution({ className = "" }: { className?: string }) {
    return (
        <p className={`text-center text-[11px] leading-relaxed text-gray-400 break-keep ${className}`}>
            도서 정보 제공: 예스24 · 제휴(애드온) 링크를 통한 도서 구매 시 북콕이 소정의 수수료를 제공받을 수 있습니다.
        </p>
    );
}
