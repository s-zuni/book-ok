import { BookMarked, User, Edit3 } from "lucide-react";

export default function VisionIntro() {
    return (
        <>
            <h2 className="text-5xl font-black tracking-tight mb-6 text-center text-gray-900">북콕이 꿈꾸는 아이들의 미래, <span className="text-green-600">북콕 비전</span></h2>
            <p className="text-lg text-gray-600 leading-relaxed text-center mb-12 max-w-3xl mx-auto">북콕의 비전은 모든 어린이가 책을 통해 세상을 배우고, 자신의 꿈을 발견하며, 따뜻한 마음을 가진 어른으로 성장하도록 돕는 것입니다. 저희는 독서가 단순히 글자를 읽는 행위를 넘어, 아이의 삶을 변화시키는 가장 강력한 도구라고 믿습니다.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-md border border-gray-100">
                    <BookMarked size={48} className="text-green-600 mb-4" />
                    <h3 className="font-black text-2xl text-gray-800 mb-3">자기주도적 학습 능력</h3>
                    <p className="text-gray-600 leading-relaxed">스스로 책을 선택하고 즐기는 경험을 통해 아이가 평생 학습의 기쁨을 알게 합니다.</p>
                </div>

                <div className="bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-md border border-gray-100">
                    <User size={48} className="text-blue-600 mb-4" />
                    <h3 className="font-black text-2xl text-gray-800 mb-3">공감과 소통 능력</h3>
                    <p className="text-gray-600 leading-relaxed">다양한 이야기를 통해 타인의 감정을 이해하고, 더불어 살아가는 지혜를 배웁니다.</p>
                </div>

                <div className="bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-md border border-gray-100">
                    <Edit3 size={48} className="text-yellow-600 mb-4" />
                    <h3 className="font-black text-2xl text-gray-800 mb-3">창의적 문제 해결 능력</h3>
                    <p className="text-gray-600 leading-relaxed">책 속의 무한한 상상력은 아이가 현실의 문제를 창의적으로 해결하는 밑거름이 됩니다.</p>
                </div>
            </div>

            <p className="text-lg text-gray-600 leading-relaxed text-center mt-12 max-w-3xl mx-auto">북콕은 기술과 교육에 대한 진심을 담아, 부모님과 아이 모두가 행복한 독서 문화를 만들어가는 데 앞장서겠습니다.</p>
        </>
    );
}
