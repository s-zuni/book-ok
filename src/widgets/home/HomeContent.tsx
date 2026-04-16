"use client";

import { useState, useEffect } from "react";
import { Child, MainMenu } from "@shared/types";
import Header from "@shared/ui/Header";
import { useAuth } from "@features/auth/AuthContext";
import { useRouter } from "next/navigation";
import HeroSection from "@widgets/hero/HeroSection";
import RecommendationSection from "@features/books/RecommendationSection";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MainPopup from "@shared/ui/MainPopup";

// Premium Icon Wrappers to match the new design system
const CustomIcon = ({ children, colorClass }: { children: React.ReactNode, colorClass: string }) => (
    <div className={`w-14 h-14 ${colorClass} rounded-2xl flex items-center justify-center mb-6 shadow-sm transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
        {children}
    </div>
);

const BookIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
);

const UserIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const TrophyIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.45.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);

export default function HomeContent() {
    const [activeMenu, setActiveMenu] = useState<MainMenu>('rec');
    const [activeSubMenu, setActiveSubMenu] = useState('');
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (page?: number) => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const { user, children } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!activeChild && children.length > 0) {
            setActiveChild(children[0]);
        }
    }, [children, activeChild]);

    const dummySetView = () => { };

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans">
            <Header
                view="main"
                setView={dummySetView}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                setActiveSubMenu={setActiveSubMenu}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={() => handleSearch(1)}
                activeSubMenu={activeSubMenu}
            />

            <main className="pb-24 min-h-screen">
                <div className="max-w-[1920px] mx-auto">
                    {activeSubMenu === '' ? (
                        <>
                            <HeroSection />
                            <div className="max-w-7xl mx-auto px-6 py-12">
                                <div className="flex items-center justify-between mb-10">
                                    <h2 className="text-2xl font-black tracking-tight text-[#2E5A44]">오늘의 발견 <span className="text-gray-300 font-light mx-2">/</span> <span className="text-gray-400">컬렉션</span></h2>
                                    <span className="text-sm font-bold text-gray-300 uppercase tracking-widest animate-pulse">New Arrival</span>
                                </div>
                                <div className="grid md:grid-cols-3 gap-8">
                                    {/* Librarian Picks */}
                                    <button
                                        onClick={() => setActiveSubMenu('사서 추천')}
                                        className="bg-white p-9 rounded-[40px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_20px_40px_rgba(46,90,68,0.1)] hover:border-[#2E5A44]/20 transition-all duration-500 text-left group overflow-hidden relative"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8F5E9] rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-150 transition-transform duration-700" />
                                        <CustomIcon colorClass="bg-white text-[#2E5A44]">
                                            <BookIcon />
                                        </CustomIcon>
                                        <h3 className="text-xl font-black mb-3 group-hover:text-[#2E5A44] transition-colors relative z-10">사서 추천</h3>
                                        <p className="text-gray-400 text-sm mb-8 leading-relaxed relative z-10">전국 도서관 사서들이 엄선한<br />올해의 가장 풍요로운 필독서</p>
                                        <div className="flex items-center text-sm font-black text-gray-300 group-hover:text-[#2E5A44] transition-all duration-300 relative z-10">
                                            컬렉션 탐색 <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </button>

                                    {/* Age-based Recommendations */}
                                    <button
                                        onClick={() => setActiveSubMenu('연령별 추천 도서')}
                                        className="bg-gray-50 p-9 rounded-[40px] shadow-sm border border-transparent hover:bg-white hover:shadow-[0_20px_40px_rgba(46,90,68,0.1)] hover:border-[#2E5A44]/20 transition-all duration-500 text-left group overflow-hidden relative"
                                    >
                                        <div className="absolute bottom-0 right-0 w-24 h-24 bg-[#2E5A44]/5 rounded-full -mr-8 -mb-8 opacity-50 group-hover:scale-150 transition-transform duration-700" />
                                        <CustomIcon colorClass="bg-white text-gray-900">
                                            <UserIcon />
                                        </CustomIcon>
                                        <h3 className="text-xl font-black mb-3 group-hover:text-[#2E5A44] transition-colors relative z-10">단계별 매칭</h3>
                                        <p className="text-gray-400 text-sm mb-8 leading-relaxed relative z-10">우리 아이의 성장 속도에 맞춘<br />단계별 맞춤 도서 라이브러리</p>
                                        <div className="flex items-center text-sm font-black text-gray-300 group-hover:text-[#2E5A44] transition-all duration-300 relative z-10">
                                            모든 단계 보기 <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </button>

                                    {/* Award Winners */}
                                    <button
                                        onClick={() => setActiveSubMenu('수상 도서작')}
                                        className="bg-white p-9 rounded-[40px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_20px_40px_rgba(46,90,68,0.1)] hover:border-[#2E5A44]/20 transition-all duration-500 text-left group overflow-hidden relative"
                                    >
                                        <div className="absolute top-1/2 right-0 w-20 h-20 bg-yellow-400/10 rounded-full -mr-10 opacity-50 group-hover:scale-150 transition-transform duration-700" />
                                        <CustomIcon colorClass="bg-yellow-50 text-yellow-600">
                                            <TrophyIcon />
                                        </CustomIcon>
                                        <h3 className="text-xl font-black mb-3 group-hover:text-[#2E5A44] transition-colors relative z-10">마스터피스</h3>
                                        <p className="text-gray-400 text-sm mb-8 leading-relaxed relative z-10">검증된 문학상 수상작을 통해<br />사고의 깊이를 더하는 최고의 선택</p>
                                        <div className="flex items-center text-sm font-black text-gray-300 group-hover:text-[#2E5A44] transition-all duration-300 relative z-10">
                                            수상작 리스트 <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Detail List View */
                        <div className="max-w-7xl mx-auto px-6 py-8">
                            <button
                                onClick={() => setActiveSubMenu('')}
                                className="mb-10 flex items-center gap-2 text-gray-400 hover:text-[#2E5A44] font-black transition-all group"
                            >
                                <div className="p-2 rounded-full bg-gray-100 group-hover:bg-[#E8F5E9] transition-colors">
                                    <ChevronLeft size={20} />
                                </div>
                                홈으로 돌아가기
                            </button>

                            {activeSubMenu === '사서 추천' && (
                                <RecommendationSection
                                    title="사서 추천 컬렉션"
                                    subtitle="전국 도서관 사서들이 엄선한 올해의 필독서"
                                    query="사서추천"
                                    categoryId={activeChild && activeChild.age <= 7 ? "4123" : "1108"}
                                />
                            )}
                            {activeSubMenu === '연령별 추천 도서' && (
                                <RecommendationSection
                                    title="연령별 매칭 도서"
                                    subtitle="우리 아이 발달 단계에 맞춘 연령별 추천 도서"
                                    query="베스트셀러"
                                    categoryId={activeChild && activeChild.age <= 7 ? "4123" : "1108"}
                                />
                            )}
                            {activeSubMenu === '수상 도서작' && (
                                <RecommendationSection
                                    title="문학 마스터피스"
                                    subtitle="문학상 수상으로 작품성을 인정받은 수작"
                                    query="수상작"
                                    categoryId={activeChild && activeChild.age <= 7 ? "4123" : "1108"}
                                />
                            )}
                        </div>
                    )}
                </div>
            </main>
            <MainPopup />
        </div>
    );
}
