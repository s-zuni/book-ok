import { Sparkles, BookOpen, Star, MessageSquare } from "lucide-react";

export default function ServiceIntro() {
    return (
        <>
            <h2 className="text-5xl font-black tracking-tight mb-6 text-center text-gray-900">우리 아이의 독서 여정을 함께하는 <span className="text-green-600">북콕 서비스</span></h2>
            <p className="text-lg text-gray-600 leading-relaxed text-center mb-12 max-w-3xl mx-auto">북콕(Book,ok)은 우리 아이의 독서 경험을 더욱 풍부하고 의미 있게 만들기 위한 부모님들의 든든한 동반자입니다. 어떤 책이 우리 아이에게 꼭 맞는지, 아이의 독서 습관을 어떻게 길러줘야 할지 막막할 때, 북콕이 함께합니다.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-green-50 rounded-3xl p-8 flex flex-col items-center text-center shadow-md border border-green-100">
                    <Sparkles size={48} className="text-green-600 mb-4" />
                    <h3 className="font-black text-2xl text-gray-800 mb-3">AI 기반 맞춤 도서 추천</h3>
                    <p className="text-gray-600 leading-relaxed">아이의 연령, 관심사, 독서 수준을 분석하여 꼭 맞는 책을 추천합니다. AI가 선별한 최적의 도서로 아이의 잠재력을 깨워주세요.</p>
                </div>

                <div className="bg-blue-50 rounded-3xl p-8 flex flex-col items-center text-center shadow-md border border-blue-100">
                    <BookOpen size={48} className="text-blue-600 mb-4" />
                    <h3 className="font-black text-2xl text-gray-800 mb-3">전문가 선정 도서</h3>
                    <p className="text-gray-600 leading-relaxed">사서 및 아동 교육 전문가들이 엄선한 양질의 추천 도서 목록을 제공합니다. 검증된 도서로 아이의 독서 편식을 막아줍니다.</p>
                </div>

                <div className="bg-yellow-50 rounded-3xl p-8 flex flex-col items-center text-center shadow-md border border-yellow-100">
                    <Star size={48} className="text-yellow-600 mb-4" />
                    <h3 className="font-black text-2xl text-gray-800 mb-3">독서 성향 AI 분석</h3>
                    <p className="text-gray-600 leading-relaxed">아이의 독서 기록을 바탕으로 AI가 독서 성향을 분석하고, 균형 잡힌 독서 습관을 위한 가이드를 제시합니다. 과학적인 분석으로 올바른 독서 습관을 형성하세요.</p>
                </div>

                <div className="bg-purple-50 rounded-3xl p-8 flex flex-col items-center text-center shadow-md border border-purple-100">
                    <MessageSquare size={48} className="text-purple-600 mb-4" />
                    <h3 className="font-black text-2xl text-gray-800 mb-3">활발한 커뮤니티</h3>
                    <p className="text-gray-600 leading-relaxed">다른 부모님들과 독서 교육에 대한 고민과 정보를 나누고 소통하는 공간입니다. 함께 아이의 성장을 응원하고 지혜를 공유하세요.</p>
                </div>
            </div>
        </>
    );
}
