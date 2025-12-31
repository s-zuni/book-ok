import { Sparkles } from "lucide-react";

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

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="예: 저희 아이가 책 읽는 것을 너무 싫어해요. 어떻게 하면 책과 친해질 수 있을까요?"
                    className="w-full h-40 bg-gray-50 rounded-2xl p-6 text-base resize-none border border-gray-200 outline-none focus:ring-2 focus:ring-green-300 transition"
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

                {result && (
                    <div className="mt-10 pt-10 border-t border-gray-100 prose prose-lg max-w-none whitespace-pre-wrap">
                        {result}
                    </div>
                )}
            </div>
        </div>
    );
}
