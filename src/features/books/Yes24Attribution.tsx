/** 도서 정보가 노출되는 화면에 표기하는 출처 (예스24 Open API 이용약관 제6조 ③ 4호) */
export default function Yes24Attribution({ className = "" }: { className?: string }) {
    return <p className={`text-center text-[10px] text-gray-400 ${className}`}>도서 정보 제공: 예스24</p>;
}
