"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Child, MainMenu } from "../types";
import Header from "./Header";
// import BookGrid from "./BookGrid"; // Unused
import Sidebar from "./Sidebar"; // Leaving for now to minimize diff, or remove if unused? It is unused in new layout.
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import HeroSection from "./HeroSection";
import RecommendationSection from "./RecommendationSection";
import { ChevronLeft, BookOpen, UserCheck, Trophy, ChevronRight } from "lucide-react";

export default function HomeContent() {
    const [activeMenu, setActiveMenu] = useState<MainMenu>('rec');
    const [activeSubMenu, setActiveSubMenu] = useState(''); // Default: Landing Page
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (page?: number) => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    // const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]); // Removed legacy
    // const [loading, setLoading] = useState(false); // Removed legacy
    // const [error, setError] = useState<string | null>(null); // Removed legacy
    const [activeChild, setActiveChild] = useState<Child | null>(null);

    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            supabase.from('children').select('*').eq('parent_id', user.id).then(({ data }) => {
                if (data && data.length > 0) {
                    const child = data[0];
                    const age = new Date().getFullYear() - new Date(child.birthdate).getFullYear();
                    setActiveChild({ ...child, age });
                }
            });
        }
    }, [user]);





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

            <main className="pb-20 min-h-screen">
                <div className="max-w-[1920px] mx-auto">

                    {/* Landing Page View */}
                    {activeSubMenu === '' ? (
                        <>
                            <HeroSection />

                            <div className="max-w-7xl mx-auto px-6 py-12">
                                <h2 className="text-2xl font-black mb-8">추천 도서 컬렉션</h2>
                                <div className="grid md:grid-cols-3 gap-6">
                                    {/* Librarian Picks */}
                                    <button
                                        onClick={() => setActiveSubMenu('사서 추천')}
                                        className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-green-200 transition-all text-left group"
                                    >
                                        <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            <BookOpen size={28} strokeWidth={2.5} />
                                        </div>
                                        <h3 className="text-xl font-black mb-2 group-hover:text-green-700 transition-colors">사서 추천</h3>
                                        <p className="text-gray-400 text-sm mb-6">전국 도서관 사서들이 엄선한<br />올해의 필독서</p>
                                        <div className="flex items-center text-sm font-bold text-gray-300 group-hover:text-green-600 transition-colors">
                                            보러가기 <ChevronRight size={16} className="ml-1" />
                                        </div>
                                    </button>

                                    {/* Age-based Recommendations */}
                                    <button
                                        onClick={() => setActiveSubMenu('연령별 추천 도서')}
                                        className="bg-gray-50 p-8 rounded-4xl shadow-sm border border-transparent hover:bg-white hover:shadow-lg hover:border-green-200 transition-all text-left group"
                                    >
                                        <div className="w-14 h-14 bg-white text-gray-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                                            <UserCheck size={28} strokeWidth={2.5} />
                                        </div>
                                        <h3 className="text-xl font-black mb-2 group-hover:text-green-700 transition-colors">연령별 추천 도서</h3>
                                        <p className="text-gray-400 text-sm mb-6">우리 아이 나이에 딱 맞는<br />단계별 맞춤 도서</p>
                                        <div className="flex items-center text-sm font-bold text-gray-300 group-hover:text-green-600 transition-colors">
                                            보러가기 <ChevronRight size={16} className="ml-1" />
                                        </div>
                                    </button>

                                    {/* Award Winners */}
                                    <button
                                        onClick={() => setActiveSubMenu('수상 도서작')}
                                        className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-green-200 transition-all text-left group"
                                    >
                                        <div className="w-14 h-14 bg-yellow-50 text-yellow-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            <Trophy size={28} strokeWidth={2.5} />
                                        </div>
                                        <h3 className="text-xl font-black mb-2 group-hover:text-green-700 transition-colors">수상 도서작</h3>
                                        <p className="text-gray-400 text-sm mb-6">문학상 수상으로 작품성을<br />인정받은 수작</p>
                                        <div className="flex items-center text-sm font-bold text-gray-300 group-hover:text-green-600 transition-colors">
                                            보러가기 <ChevronRight size={16} className="ml-1" />
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
                                className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-colors"
                            >
                                <ChevronLeft size={20} /> 홈으로 돌아가기
                            </button>

                            {activeSubMenu === '사서 추천' && (
                                <RecommendationSection
                                    title="사서 추천"
                                    subtitle="전국 도서관 사서들이 엄선한 올해의 필독서"
                                    query="사서추천"
                                    categoryId={activeChild && activeChild.age <= 7 ? "4123" : "1108"}
                                />
                            )}
                            {activeSubMenu === '연령별 추천 도서' && (
                                <RecommendationSection
                                    title="연령별 추천 도서"
                                    subtitle="우리 아이 발달 단계에 맞춘 연령별 추천 도서"
                                    query="베스트셀러"
                                    categoryId={activeChild && activeChild.age <= 7 ? "4123" : "1108"}
                                />
                            )}
                            {activeSubMenu === '수상 도서작' && (
                                <RecommendationSection
                                    title="수상 도서작"
                                    subtitle="문학상 수상으로 작품성을 인정받은 수작"
                                    query="수상작"
                                    categoryId={activeChild && activeChild.age <= 7 ? "4123" : "1108"}
                                />
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
