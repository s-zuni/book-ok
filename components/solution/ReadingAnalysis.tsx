import { Sparkles, Bot, CheckCircle2, ShieldCheck } from "lucide-react";
import { Book, Child } from "../../types";
import ReadingRadarChart from "./ReadingRadarChart";
import AIRecommendationList from "./AIRecommendationList";

interface ReadingAnalysisProps {
    activeChild: Child | null;
    userReadBooks: Book[];
    getReadingAnalysis: () => void;
    loading: boolean;
    result: string;
    chartData: { subject: string; A: number; fullMark: number; }[];
    keywords?: string[];
}

export default function ReadingAnalysis({
    activeChild,
    userReadBooks,
    getReadingAnalysis,
    loading,
    result,
    chartData,
    keywords = []
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
                {/* Right: Chart (Only visible when there is data) OR Educational Info */}
                {chartData.length > 0 ? (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 flex flex-col justify-center animate-in fade-in">
                        <h3 className="text-xl font-black mb-4 text-center text-gray-800">독서 성향 분석 차트</h3>
                        <ReadingRadarChart data={chartData} />
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-5">
                        <div className="bg-linear-to-br from-blue-50 to-indigo-50/50 rounded-[2.5rem] p-8 border border-blue-100/50 text-blue-900">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600">
                                    <Bot size={24} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-xl font-black">왜 분석이 필요한가요?</h3>
                            </div>
                            <ul className="space-y-4 font-medium text-gray-600">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="text-blue-500 shrink-0 mt-0.5" size={20} />
                                    <span>우리 아이가 편식 없이 <span className="text-blue-700 font-bold bg-blue-100/50 px-1 rounded">골고루 읽고 있는지</span> 점검해요.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="text-blue-500 shrink-0 mt-0.5" size={20} />
                                    <span>어휘력, 이해력, 상상력 등 <span className="text-blue-700 font-bold bg-blue-100/50 px-1 rounded">5대 독서지표</span>를 진단해요.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="text-blue-500 shrink-0 mt-0.5" size={20} />
                                    <span>결과에 따라 <span className="text-blue-700 font-bold bg-blue-100/50 px-1 rounded">부족한 영역을 보완할 책</span>을 추천받아요.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-gray-900 mb-1 text-lg">아동 심리 전문가 자문</h4>
                                <p className="text-sm text-gray-500">독서 교육 전문 모델 기반 분석 알고리즘</p>
                            </div>
                            <ShieldCheck size={48} className="text-green-500/20" strokeWidth={1.5} />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom: Text Result & Recommendations */}
            {result && (
                <div className="space-y-8 mt-8">
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10 animate-in slide-in-from-bottom-5">
                        <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
                            <Sparkles className="text-green-500" />
                            AI 분석 결과
                        </h3>
                        <div className="prose prose-lg max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {result}
                        </div>
                    </div>

                    {/* AI Recommendation List */}
                    {keywords.length > 0 && (
                        <AIRecommendationList keywords={keywords} />
                    )}
                </div>
            )}
        </div>
    );
}
