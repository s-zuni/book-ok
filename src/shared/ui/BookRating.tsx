import { Star } from "lucide-react";

interface BookRatingProps {
    rating?: number;
    iconSize?: number;
    className?: string;
}

/** YES24 평점 표시. 평점 데이터가 없는 도서는 아무것도 렌더링하지 않습니다. */
export default function BookRating({ rating, iconSize = 10, className = "text-[10px]" }: BookRatingProps) {
    if (!rating) return null;
    return (
        <div className="flex items-center gap-0.5">
            <Star size={iconSize} className="text-[#FACC15] fill-[#FACC15]" />
            <span className={`${className} font-black text-gray-700`}>{rating}</span>
        </div>
    );
}
