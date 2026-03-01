"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HeroSection() {
    const router = useRouter();

    return (
        <section className="relative overflow-hidden bg-green-50 rounded-3xl lg:rounded-[3rem] mx-4 lg:mx-6 my-4 lg:my-6 py-12 lg:py-0 lg:min-h-[500px] flex items-center">
            {/* Background Decorative Circles */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-yellow-100/50 rounded-full blur-2xl translate-y-1/4 -translate-x-1/4 pointer-events-none" />

            <div className="container mx-auto px-8 lg:px-16 grid lg:grid-cols-2 gap-12 items-center relative z-10">
                {/* Text Content */}
                <div className="text-center lg:text-left space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm text-sm font-bold text-green-700 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        AI 기반 맞춤 도서 추천
                    </div>

                    <h1 className="text-4xl lg:text-6xl font-black text-gray-900 leading-[1.15] tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                        우리 아이를 위한 <br />
                        <span className="text-green-600">책 읽기 습관</span>의 시작
                    </h1>

                    <p className="text-lg text-gray-600 leading-relaxed max-w-lg mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        Book,ok는 아이의 성향과 관심사를 분석하여 <br className="hidden lg:block" />
                        가장 적합한 도서를 추천하고 독서 관리까지 도와줍니다.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                        <button
                            onClick={() => router.push('/chat')}
                            className="px-8 py-4 bg-gray-900 text-white rounded-full font-bold text-lg hover:bg-gray-800 transition-all hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                        >
                            지금 추천받기
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Hero Illustration/Image Placeholder */}
                <div className="relative animate-in fade-in zoom-in-95 duration-1000 delay-200 block">
                    {/* Fixed static container without animation */}
                    <div className="relative z-10 bg-white p-6 rounded-4xl shadow-2xl transition-transform duration-500 cursor-default">
                        <div className="bg-gray-100 rounded-3xl overflow-hidden aspect-4/3 flex items-center justify-center relative group">
                            {/* 3D Illustration */}
                            <div className="absolute inset-0 bg-linear-to-br from-green-100 to-blue-50" />
                            <img
                                src="/images/hero_child_reading_3d.png"
                                alt="아이 독서 3D 일러스트"
                                className="w-full h-full object-cover relative z-10"
                            />

                            {/* Floating Cards UI Elements */}
                            <div className="absolute bottom-6 left-6 right-6 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg z-20">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">🧒</div>
                                    <div>
                                        <div className="h-2.5 bg-gray-200 rounded-full w-24 mb-2" />
                                        <div className="h-2 bg-gray-100 rounded-full w-16" />
                                    </div>
                                    <div className="ml-auto font-bold text-green-600">98% 일치</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Decorative Elements behind card */}
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-yellow-300 rounded-full opacity-50 blur-xl animate-pulse" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-green-300 rounded-full opacity-30 blur-xl" />
                </div>
            </div>
        </section>
    );
}
