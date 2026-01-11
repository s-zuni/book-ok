import { Sparkles } from "lucide-react";
import { Book, Child } from "../../types";
import ReadingRadarChart from "./ReadingRadarChart";

interface ReadingAnalysisProps {
    activeChild: Child | null;
    userReadBooks: Book[];
    getReadingAnalysis: () => void;
    loading: boolean;
    result: string;
    chartData: { subject: string; A: number; fullMark: number; }[];
}

export default function ReadingAnalysis({
    activeChild,
    userReadBooks,
    getReadingAnalysis,
    loading,
    result,
    chartData
}: ReadingAnalysisProps) {
    return (
        <div className="animate-in fade-in pb-20">
            <h2 className="text-4xl font-black tracking-tight mb-4">우리 아이 독서 성향 AI 분석</h2>
            <p className="text-gray-500 mb-10">AI가 아이의 독서 기록을 바탕으로 독서 성향을 분석하고, 다음 책을 추천해 드립니다.</p>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Left: Input & Button */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 h-fit">
                    <h3 className="text-2xl font-black mb-6">'{activeChild?.name}' 아이가 읽은 책 목록</h3>
                    <div className="max-h-60 overflow-y-auto space-y-3 mb-8 border p-4 rounded-2xl bg-gray-50/50">
                        {userReadBooks.length > 0 ? userReadBooks.map(book => (
                            <div key={book.id} className="p-3 bg-white rounded-lg shadow-sm text-sm font-medium">{book.title}</div>
                        )) : (
                            <p className="text-center text-gray-400 py-8">아직 아이가 읽은 책 기록이 없습니다. 책 상세페이지에서 리뷰를 남겨주세요.</p>
                        )}
                    </div>

                    <button
                        onClick={getReadingAnalysis}
                        disabled={loading || userReadBooks.length === 0}
                        className="w-full bg-green-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
                    >
                        {loading ? (
                            <>
                                <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                <span>성향 분석 중...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} />
                                독서 성향 분석하기
                            </>
                        )}
                    </button>
                </div>

                {/* Right: Chart (Only visible when there is data) */}
                {chartData.length > 0 && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 flex flex-col justify-center">
                        <h3 className="text-xl font-black mb-4 text-center text-gray-800">독서 성향 분석 차트</h3>
                        <ReadingRadarChart data={chartData} />
                    </div>
                )}
            </div>

            {/* Bottom: Text Result */}
            {result && (
                <div className="mt-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10 animate-in slide-in-from-bottom-5">
                    <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
                        <Sparkles className="text-green-500" />
                        AI 분석 결과
                    </h3>
                    <div className="prose prose-lg max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
                        {result}
                    </div>
                </div>
            )}
        </div>
    );
}
