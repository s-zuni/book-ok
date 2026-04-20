"use client";

import { Sparkles, BookOpen, Star, MessageSquare, Check } from "lucide-react";

export default function ServiceIntro() {
    const services = [
        {
            title: "AI 기반 맞춤 도서 추천",
            description: "아이의 연령, 관심사, 독서 수준을 정밀하게 분석하여 꼭 맞는 도서를 선별합니다.",
            icon: Sparkles,
            color: "text-green-600"
        },
        {
            title: "전문가 엄선 큐레이션",
            description: "사서 및 교육 전문가들이 검증한 양질의 도서 목록을 통해 균형 잡힌 독서를 지원합니다.",
            icon: BookOpen,
            color: "text-blue-600"
        },
        {
            title: "독서 성향 데이터 분석",
            description: "독서 기록을 시각화하고 AI 분석을 통해 올바른 독서 습관 형성을 위한 가이드를 제공합니다.",
            icon: Star,
            color: "text-amber-600"
        },
        {
            title: "학부모 소통 커뮤니티",
            description: "독서 교육에 대한 고민과 유용한 정보를 다른 부모님들과 자유롭게 공유합니다.",
            icon: MessageSquare,
            color: "text-purple-600"
        }
    ];

    return (
        <div className="max-w-4xl mx-auto py-8">
            <header className="mb-16 text-center lg:text-left">
                <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-6">
                    지속 가능한 독서 습관,<br />
                    <span className="text-green-600">북콕(Book,ok)</span>이 제안합니다
                </h2>
                <div className="h-1.5 w-20 bg-green-600 rounded-full mb-8 mx-auto lg:mx-0" />
                <p className="text-lg text-gray-500 font-medium leading-relaxed break-keep">
                    북콕은 단순한 도서 추천을 넘어, 데이터와 기술을 통해 우리 아이가 책과 친해지는 과정을 돕는 큐레이션 플랫폼입니다.
                </p>
            </header>

            <div className="space-y-12">
                <section>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                        <div className="w-8 h-px bg-gray-200" />
                        Main Services
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-6">
                        {services.map((service, index) => (
                            <div 
                                key={index} 
                                className="group flex items-start gap-6 p-8 rounded-3xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-300"
                            >
                                <div className={`mt-1 p-3 rounded-2xl bg-gray-50 group-hover:bg-white group-hover:shadow-inner transition-colors ${service.color}`}>
                                    <service.icon size={24} strokeWidth={2.5} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h4>
                                    <p className="text-gray-500 font-medium leading-relaxed text-sm break-keep">
                                        {service.description}
                                    </p>
                                </div>
                                <div className="hidden sm:flex text-gray-100 mt-1">
                                    <Check size={24} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <footer className="mt-20 pt-12 border-t border-gray-50 text-center">
                <p className="text-sm font-bold text-gray-400">
                    북콕은 아이들의 건강한 성장을 위해 끊임없이 고민합니다.
                </p>
            </footer>
        </div>
    );
}
