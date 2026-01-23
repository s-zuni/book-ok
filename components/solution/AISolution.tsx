import { Sparkles, MessageCircle, Quote } from "lucide-react";
import LoadingState from "../LoadingState";
import { marked } from 'marked';

interface AISolutionProps {
    prompt: string;
    setPrompt: (value: string) => void;
    getSolution: () => void;
    loading: boolean;
    result: string;
}

export default function AISolution({
    prompt,
    setPrompt,
    getSolution,
    loading,
    result
}: AISolutionProps) {
    return (
        <div className="animate-in fade-in">
            <h2 className="text-4xl font-black tracking-tight mb-4">AI 독서 솔루션</h2>
            <p className="text-gray-500 mb-10">아이의 독서 및 교육에 대한 고민을 입력하시면, AI 전문가가 신뢰성 있는 근거를 바탕으로 솔루션을 제공해 드립니다.</p>

            <div className="grid lg:grid-cols-5 gap-8">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 lg:col-span-3 h-fit">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-gray-900">
                        <MessageCircle className="text-green-500" />
                        고민을 자세히 들려주세요
                    </h3>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="예: 저희 아이가 책 읽는 것을 너무 싫어해요. 어떻게 하면 책과 친해질 수 있을까요? (50자 이상 자세히 적어주시면 더 정확한 솔루션을 드릴 수 있어요)"
                        className="w-full h-40 bg-gray-50 rounded-2xl p-6 text-base resize-none border border-gray-200 outline-none focus:ring-2 focus:ring-green-300 transition placeholder:text-gray-400"
                    />
                    <button
                        onClick={getSolution}
                        disabled={loading}
                        className="mt-6 w-full bg-green-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
                    >
                        {loading ? (
                            <>
                                <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                <span>솔루션 생성 중...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} />
                                AI 솔루션 받기
                            </>
                        )}
                    </button>

                    {loading && (
                        <div className="mt-10 pt-10 border-t border-gray-100">
                            <LoadingState messages={["도서 전문가 AI가 고민을 분석하고 있어요...", "아동 발달 이론을 바탕으로 솔루션을 찾고 있어요...", "실질적인 해결책을 정리하고 있어요..."]} />
                        </div>
                    )}

                    {!loading && result && (
                        <div className="mt-10 pt-10 border-t border-gray-100 animate-in fade-in">
                            <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-gray-900">
                                <Sparkles className="text-green-500" /> 솔루션 도착
                            </h3>
                            <div
                                className="prose prose-lg max-w-none text-gray-700 leading-relaxed bg-green-50/50 p-8 rounded-3xl border border-green-100/50"
                                dangerouslySetInnerHTML={{ __html: marked.parse(result) as string }}
                            />
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {/* Common Questions */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Sparkles size={16} className="text-yellow-500" /> 자주 묻는 고민
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {[
                                "책을 읽을 때 집중을 못해요.",
                                "만화책만 보려고 해요. 괜찮을까요?",
                                "또래보다 어휘력이 부족한 것 같아요.",
                                "잠자리 독서 습관을 들이고 싶어요.",
                                "글밥이 많은 책은 거부해요."
                            ].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => setPrompt(q)}
                                    className="text-xs font-bold bg-gray-50 text-gray-600 px-3 py-2 rounded-xl hover:bg-green-50 hover:text-green-700 transition text-left"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Expert Badge */}
                    <div className="bg-green-50 p-8 rounded-[2.5rem] border border-green-100 relative overflow-hidden">
                        <Quote className="absolute top-6 right-6 text-green-200" size={60} />
                        <h3 className="relative font-bold text-green-900 mb-2">믿을 수 있는 AI 답변</h3>
                        <p className="relative text-sm text-green-800 leading-relaxed font-medium">
                            Book,ok의 AI 솔루션은 <span className="underline decoration-green-300 decoration-2">아동 발달 심리학</span>과 <span className="underline decoration-green-300 decoration-2">독서 교육학 이론</span>을 기반으로 검증된 답변만을 제공합니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
