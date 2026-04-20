"use client";

import { BookMarked, User, Edit3, Target } from "lucide-react";

export default function VisionIntro() {
    const visions = [
        {
            title: "자기주도적 학습 능력 양성",
            description: "아이가 스스로 도서를 선택하고 몰입하는 과정을 통해 평생 지속될 지적 호기심과 학습의 즐거움을 깨닫게 합니다.",
            icon: BookMarked,
            color: "text-green-600"
        },
        {
            title: "공감과 포용의 가치 실현",
            description: "다양한 문학적 배경을 접하며 타인의 감정을 이해하고, 다원화된 사회에서 더불어 살아가는 따뜻한 지혜를 배웁니다.",
            icon: User,
            color: "text-blue-600"
        },
        {
            title: "창의적 문제 해결 능력 강화",
            description: "책 속의 무한한 세계를 탐험하며 얻은 상상력을 바탕으로, 현실의 복합적인 문제들을 창의적으로 해결하는 주체로 성장시킵니다.",
            icon: Edit3,
            color: "text-amber-600"
        }
    ];

    return (
        <div className="max-w-4xl mx-auto py-8">
            <header className="mb-16 text-center lg:text-left">
                <h3 className="text-xs font-black text-green-600 uppercase tracking-[0.3em] mb-4">Our Vision</h3>
                <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-6">
                    책을 통해 성장하는<br />
                    아름다운 내일을 꿈꿉니다
                </h2>
                <p className="text-lg text-gray-500 font-medium leading-relaxed break-keep max-w-2xl">
                    북콕의 비전은 모든 어린이가 독서를 통해 세상을 넓게 보고, 자신의 가능성을 발견하여 가치 있는 삶을 꾸려나가도록 돕는 것입니다.
                </p>
            </header>

            <div className="space-y-16">
                <div className="grid grid-cols-1 gap-10">
                    {visions.map((vision, index) => (
                        <div key={index} className="flex flex-col md:flex-row gap-8 items-start">
                            <div className={`p-4 rounded-3xl bg-gray-50 ${vision.color}`}>
                                <vision.icon size={32} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-xl font-bold text-gray-900 mb-3">{vision.title}</h4>
                                <p className="text-gray-500 font-medium leading-relaxed text-sm break-keep">
                                    {vision.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-[#1e2939] rounded-[2.5rem] p-10 md:p-14 text-white overflow-hidden relative">
                    <div className="relative z-10">
                        <Target className="text-green-400 mb-6" size={40} />
                        <h4 className="text-2xl font-black mb-4">함께 만드는 독서 문화</h4>
                        <p className="text-gray-300 font-medium leading-relaxed break-keep">
                            북콕은 기술과 교육에 대한 진심을 담아, 부모님과 아이 모두가 행복하고 건강한 독서 문화를 만들어가는 데 앞장서겠습니다. 우리는 아이들이 글자 너머의 가치를 발견하는 그 순간을 위해 존재합니다.
                        </p>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-green-600/10 rounded-full blur-3xl" />
                </div>
            </div>
        </div>
    );
}
