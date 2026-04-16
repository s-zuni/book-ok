import { Sparkles, Bot, CheckCircle2, ShieldCheck, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Book, Child } from "@shared/types";
import ReadingCategoryChart from "@widgets/solution/ReadingCategoryChart";
import AIRecommendationList from "@widgets/solution/AIRecommendationList";
import ReadingPlanRoadmap from "@widgets/solution/ReadingPlanRoadmap";
import LoadingState from "@shared/ui/LoadingState";
import EmptyState from "@shared/ui/EmptyState";
import { marked } from 'marked';
import { useState } from "react";
import { useAuth } from "@features/auth/AuthContext";
import { useLoginModal } from "@features/auth/LoginModalContext";

interface ReadingAnalysisProps {
    activeChild: Child | null;
    userReadBooks: Book[];
    getReadingAnalysis: (observations?: any) => void;
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
    const { user } = useAuth();
    const { openLoginModal } = useLoginModal();
    const [isObservationOpen, setIsObservationOpen] = useState(false);
    const [observations, setObservations] = useState<{ [key: string]: string }>({});

    const handleObservationChange = (key: string, value: string) => {
        setObservations(prev => ({ ...prev, [key]: value }));
    };

    const getAgeGroupQuestions = (age: number) => {
        if (age < 5) {
            return [
                { id: 'interest', label: '아이가 그림이나 소리에 반응하나요?', placeholder: '예: 그림을 짚으며 옹알이를 합니다.' },
                { id: 'interaction', label: '책을 읽어줄 때 상호작용은 어떤가요?', placeholder: '예: 페이지를 직접 넘기려고 합니다.' }
            ];
        } else if (age >= 5 && age < 7) {
            return [
                { id: 'decoding', label: '글자를 소리내어 읽을 수 있나요?', placeholder: '예: 받침 없는 글자는 읽습니다.' },
                { id: 'phonics', label: '발음이 명확한가요?', placeholder: '예: ㄹ 발음을 어려워합니다.' }
            ];
        } else if (age >= 7 && age < 9) { // 전환기 (핵심)
            return [
                { id: 'fluency', label: '책을 끊김 없이 술술 읽나요? (유창성)', placeholder: '예: 아직 떠듬떠듬 읽는 편입니다.' },
                { id: 'independence', label: '혼자서 책 한 권을 끝까지 읽나요?', placeholder: '예: 20페이지 정도는 혼자 읽습니다.' }
            ];
        } else if (age >= 9 && age < 12) {
            return [
                { id: 'critical', label: '책 내용을 비판적으로 질문하나요?', placeholder: '예: 주인공의 행동이 이해 안 간다고 말했습니다.' },
                { id: 'vocabulary', label: '모르는 단어를 자주 물어보나요?', placeholder: '예: 추상적인 어휘를 자주 물어봅니다.' }
            ];
        } else {
            return [
                { id: 'advanced', label: '책을 읽고 자신의 생각을 글로 표현하나요?', placeholder: '예: 독후감을 짧게 씁니다.' },
                { id: 'preference', label: '선호하는 장르가 뚜렷한가요?', placeholder: '예: 판타지 소설만 읽으려 합니다.' }
            ];
        }
    };

    const questions = activeChild ? getAgeGroupQuestions(activeChild.age) : [];

    return (
        <div className="animate-in fade-in pb-20">
            <h2 className="text-4xl font-black tracking-tight mb-4">우리 아이 독서 성향 AI 분석</h2>
            <p className="text-gray-500 mb-10">AI가 아이의 독서 기록과 부모님의 관찰을 결합하여, 발달 단계에 맞는 초개인화된 분석을 제공합니다.</p>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Left: Input & Button */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 h-fit">
                    <h3 className="text-2xl font-black mb-6">'{activeChild?.name}' 아이가 읽은 책 목록</h3>
                    <div className="max-h-60 overflow-y-auto space-y-3 mb-6 border p-4 rounded-2xl bg-gray-50/50">
                        {userReadBooks.length > 0 ? userReadBooks.map(book => (
                            <div key={book.id} className="p-3 bg-white rounded-lg shadow-sm text-sm font-medium">{book.title}</div>
                        )) : (
                            <div className="py-8">
                                <EmptyState
                                    icon={BookOpen}
                                    title="읽은 책이 없어요"
                                    description="책을 읽고 기록을 남겨보세요."
                                />
                            </div>
                        )}
                    </div>

                    {/* Detailed Observation Input (Optional) */}
                    {activeChild && (
                        <div className="mb-6">
                            <button
                                onClick={() => setIsObservationOpen(!isObservationOpen)}
                                className="flex items-center justify-between w-full p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold hover:bg-blue-100 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <ShieldCheck size={18} />
                                    더 정확한 분석을 위해 관찰 내용 입력하기
                                </span>
                                {isObservationOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>

                            {isObservationOpen && (
                                <div className="mt-4 space-y-4 p-4 border border-blue-100 rounded-2xl animate-in slide-in-from-top-2">
                                    <p className="text-sm text-gray-500 mb-2">
                                        아이의 현재 나이(만 {activeChild.age}세)에 맞는 질문입니다. 편하게 적어주세요.
                                    </p>
                                    {questions.map((q) => (
                                        <div key={q.id}>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                                {q.label}
                                            </label>
                                            <input
                                                type="text"
                                                value={observations[q.id] || ''}
                                                onChange={(e) => handleObservationChange(q.id, e.target.value)}
                                                placeholder={q.placeholder}
                                                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={() => {
                            if (!user) return openLoginModal();
                            getReadingAnalysis(observations);
                        }}
                        disabled={loading || (user ? userReadBooks.length === 0 : false)}
                        className="w-full bg-green-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
                    >
                        {loading ? (
                            <>
                                <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                <span>발달 단계 정밀 분석 중...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} />
                                독서 성향 분석하기
                            </>
                        )}
                    </button>
                    {isObservationOpen && <p className="text-xs text-gray-400 text-center mt-2">* 입력한 정보는 AI 분석에만 활용됩니다.</p>}
                </div>

                {/* Right: Chart or Info */}
                {loading ? (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 flex flex-col justify-center items-center animate-in fade-in min-h-[400px]">
                        <LoadingState messages={[
                            `만 ${activeChild?.age || ''}세 발달 단계(SAV)를 확인하고 있어요...`,
                            "부모님의 관찰 기록을 분석에 반영 중이에요...",
                            "최적의 독서 솔루션을 생성하고 있어요..."
                        ]} />
                    </div>
                ) : (
                    // Always show the chart if we have books, regardless of "Analysis" button click state?
                    // The user said "Analysis Results" are fake. We want to show REAL STATS.
                    // So we should show this chart ALWAYS if there are books.
                    // But layout puts it on the Right.
                    // If no analysis result yet, show Chart? Yes.
                    // If result exists, still show Chart? Yes.
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 flex flex-col justify-center animate-in fade-in min-h-[400px]">
                        <h3 className="text-xl font-black mb-4 text-center text-gray-800">선호 독서 주제 통계</h3>
                        {userReadBooks.length > 0 ? (
                            <>
                                <ReadingCategoryChart books={userReadBooks} />
                                <p className="text-center text-xs text-gray-400 mt-4 font-medium">
                                    * 최근 읽은 {userReadBooks.length}권의 데이터를 분석했습니다.
                                </p>
                            </>
                        ) : (
                            <div className="text-center text-gray-400 py-10 font-bold">
                                <p className="mb-2">아직 데이터가 부족해요.</p>
                                <p className="text-sm font-normal">책을 읽고 기록을 남기면 그래프가 나타납니다.</p>
                            </div>
                        )}

                        {/* Insufficient Data Warning */}
                        {userReadBooks.length < 3 && userReadBooks.length > 0 && (
                            <div className="mt-6 p-4 bg-yellow-50 rounded-2xl flex items-start gap-3">
                                <ShieldCheck className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                                <p className="text-xs text-yellow-800 font-bold break-keep">
                                    데이터가 충분하지 않아 AI 분석이 제한적일 수 있습니다. (권장: 3권 이상)
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom: Text Result & Recommendations */}
            {result && (
                <div className="space-y-8 mt-8">
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10 animate-in slide-in-from-bottom-5">
                        <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
                            <Sparkles className="text-green-500" />
                            AI 솔루션 레포트
                        </h3>
                        <div className="prose prose-lg max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: marked.parse(result as string) as string }}
                        />
                    </div>

                    {/* AI Recommendation List */}
                    {keywords.length > 0 && (
                        <AIRecommendationList keywords={keywords} readBooks={userReadBooks} />
                    )}

                    {/* Reading Plan Roadmap */}
                    <ReadingPlanRoadmap
                        child={activeChild}
                        readBooks={userReadBooks}
                        keywords={keywords}
                        analysisResult={result}
                    />
                </div>
            )}
        </div>
    );
}
