"use client";

import { useState, useEffect } from "react";
import { Child, MainMenu } from "@shared/types";
import Header from "@shared/ui/Header";
import { useAuth } from "@features/auth/AuthContext";
import { useRouter } from "next/navigation";
import HeroSection from "@widgets/hero/HeroSection";
import RecommendationSection from "@features/books/RecommendationSection";
import { ChevronLeft, ChevronRight, Bell, Search, Star, BookOpen } from "lucide-react";
import MainPopup from "@shared/ui/MainPopup";
import Image from "next/image";

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
    const { user, children, userProfile } = useAuth();
    const router = useRouter();

    // Mobile specific states for Aladin books
    const [librarianBooks, setLibrarianBooks] = useState<any[]>([]);
    const [awardBooks, setAwardBooks] = useState<any[]>([]);
    const [librarianLoading, setLibrarianLoading] = useState(false);
    const [awardLoading, setAwardLoading] = useState(false);
    const [librarianSort, setLibrarianSort] = useState<'latest' | 'popular'>('popular');
    const [awardSort, setAwardSort] = useState<'latest' | 'popular'>('popular');

    useEffect(() => {
        if (!activeChild && children.length > 0) {
            setActiveChild(children[0]);
        }
    }, [children, activeChild]);

    // Fetch Aladin book recommendations for the mobile home view
    useEffect(() => {
        const fetchLibrarianPicks = async () => {
            setLibrarianLoading(true);
            try {
                const queryType = librarianSort === 'popular' ? 'ItemEditorChoice' : 'ItemNewAll';
                const res = await fetch(`/api/recommendations?apiType=ItemList&queryType=${queryType}&categoryId=1108`);
                if (res.ok) {
                    const data = await res.json();
                    const items = data.item?.slice(0, 8) || [];
                    const formatted = items.map((item: any) => ({
                        title: item.title.split(" - ")[0],
                        author: item.author.replace(/\s*\(지은이\)|\s*\(그림\)|\s*\(글\)/g, "").split(",")[0].trim(),
                        publisher: item.publisher,
                        rating: item.customerRating ? parseFloat((item.customerRating / 2).toFixed(1)) : 4.8,
                        reviewsCount: item.salesPoint ? Math.min(Math.floor(item.salesPoint / 100), 400) + 21 : Math.floor(Math.random() * 50) + 120,
                        coverUrl: item.cover
                    }));
                    setLibrarianBooks(formatted);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLibrarianLoading(false);
            }
        };

        fetchLibrarianPicks();
    }, [librarianSort]);

    useEffect(() => {
        const fetchAwards = async () => {
            setAwardLoading(true);
            try {
                const sortType = awardSort === 'popular' ? 'SalesPoint' : 'PublishTime';
                const res = await fetch(`/api/recommendations?query=${encodeURIComponent("수상작")}&apiType=ItemSearch&sort=${sortType}&categoryId=1108`);
                if (res.ok) {
                    const data = await res.json();
                    const items = data.item?.slice(0, 8) || [];
                    const formatted = items.map((item: any) => ({
                        title: item.title.split(" - ")[0],
                        author: item.author.replace(/\s*\(지은이\)|\s*\(그림\)|\s*\(글\)/g, "").split(",")[0].trim(),
                        publisher: item.publisher,
                        rating: item.customerRating ? parseFloat((item.customerRating / 2).toFixed(1)) : 4.8,
                        reviewsCount: item.salesPoint ? Math.min(Math.floor(item.salesPoint / 100), 300) + 15 : Math.floor(Math.random() * 50) + 90,
                        coverUrl: item.cover
                    }));
                    setAwardBooks(formatted);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setAwardLoading(false);
            }
        };

        fetchAwards();
    }, [awardSort]);

    const dummySetView = () => { };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans pb-24 lg:pb-0">
            {/* Desktop View (lg:block) */}
            <div className="hidden lg:block bg-[#FDFDFD]">
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
            </div>

            {/* ============================================================== */}
            {/* Mobile / Hybrid App View (lg:hidden) */}
            {/* ============================================================== */}
            <div className="lg:hidden flex flex-col min-h-screen bg-[#F8F9FA] pb-24">
                {/* Mobile Header */}
                <header className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 shrink-0">
                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="bg-[#16A34A] p-1.5 rounded-xl text-white">
                            <BookOpen size={18} />
                        </div>
                        <span className="text-base font-black tracking-tight text-gray-900">Book,ok</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="text-gray-700 p-1">
                            <Search size={20} />
                        </button>
                        <button className="text-gray-700 p-1">
                            <Bell size={20} />
                        </button>
                        <button className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20 rounded-full px-3 py-1 text-[11px] font-black tracking-tight">
                            부모
                        </button>
                    </div>
                </header>

                {/* Welcome Message */}
                <div className="p-5 bg-white">
                    <p className="text-xs font-bold text-gray-400 mb-1">안녕하세요 {userProfile?.nickname || user?.user_metadata?.name || "유수미"}님!</p>
                    <h2 className="text-xl font-black leading-tight text-gray-900 tracking-tight">
                        지명이를 위한 오늘의 책,<br />
                        <span className="text-gray-900">함께 골라볼까요?</span>
                    </h2>
                </div>

                {/* Challenge Banner Carousel */}
                <div className="px-4 py-2">
                    <div className="bg-gradient-to-br from-blue-50/50 via-teal-50/40 to-green-50/30 border border-green-100/60 rounded-[32px] p-5 relative overflow-hidden flex justify-between items-center h-[120px]">
                        <div className="space-y-1 z-10 flex-1 pr-4">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">이번 주 독서 챌린지</div>
                            <h3 className="text-base font-black text-gray-900">5일 연속 책 읽기 🔥</h3>
                            <p className="text-[11px] font-bold text-gray-400">2일만 더 하면 '독서왕' 뱃지 획득!</p>
                        </div>
                        
                        <div className="relative w-[110px] h-[90px] shrink-0 self-end -mb-2 overflow-visible">
                            <Image
                                src="/images/hero_child_reading_3d.png"
                                alt="Child reading 3D"
                                fill
                                className="object-contain object-bottom"
                                sizes="110px"
                            />
                        </div>
                    </div>
                    {/* Carousel Indicators */}
                    <div className="flex justify-center items-center gap-1.5 mt-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                    </div>
                </div>

                {/* Section 1: Librarian Recommended Books */}
                <div className="py-4 space-y-3.5">
                    <div className="flex justify-between items-center px-5">
                        <h3 className="font-black text-base text-gray-900 tracking-tight">사서가 추천하는 책</h3>
                        <span className="text-xs font-bold text-gray-400 cursor-pointer">더보기 &gt;</span>
                    </div>

                    {/* Sort Filter Tabs */}
                    <div className="flex gap-2 px-5 text-xs font-bold">
                        <button
                            onClick={() => setLibrarianSort('latest')}
                            className={`px-3 py-1.5 rounded-full transition-all border ${
                                librarianSort === 'latest'
                                    ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white font-black'
                                    : 'bg-white border-gray-150 text-gray-400'
                            }`}
                        >
                            최신순
                        </button>
                        <button
                            onClick={() => setLibrarianSort('popular')}
                            className={`px-3 py-1.5 rounded-full transition-all border ${
                                librarianSort === 'popular'
                                    ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white font-black'
                                    : 'bg-white border-gray-150 text-gray-400'
                            }`}
                        >
                            인기순
                        </button>
                    </div>

                    {/* Librarian Books scroll view */}
                    <div className="flex overflow-x-auto gap-4 py-1 px-5 scrollbar-hide">
                        {librarianLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-white rounded-[24px] p-2.5 border border-gray-100 w-[128px] shrink-0 animate-pulse">
                                    <div className="w-full h-[145px] bg-gray-150 rounded-[16px] mb-2" />
                                    <div className="h-3 bg-gray-150 rounded w-4/5 mb-1" />
                                    <div className="h-2.5 bg-gray-150 rounded w-3/5" />
                                </div>
                            ))
                        ) : (
                            librarianBooks.map((book, idx) => (
                                <div key={idx} className="bg-white rounded-[24px] p-2.5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] w-[128px] shrink-0">
                                    <div className="relative w-full h-[145px] rounded-[16px] overflow-hidden mb-2.5 border border-gray-50">
                                        <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="128px" />
                                    </div>
                                    <h4 className="font-extrabold text-[11px] text-gray-900 tracking-tight line-clamp-1 mb-0.5">{book.title}</h4>
                                    <p className="text-[8.5px] text-gray-400 font-bold tracking-tight mb-1 truncate">{book.author} / {book.publisher}</p>
                                    <div className="flex items-center gap-0.5 text-[#16A34A]">
                                        <Star size={9} fill="currentColor" />
                                        <span className="text-[10px] font-black">{book.rating}</span>
                                        <span className="text-[10px] font-bold text-gray-400">({book.reviewsCount})</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Section 2: Award Winner Books */}
                <div className="py-2 space-y-3.5">
                    <div className="flex justify-between items-center px-5">
                        <h3 className="font-black text-base text-gray-900 tracking-tight">수상작 도서</h3>
                        <span className="text-xs font-bold text-gray-400 cursor-pointer">더보기 &gt;</span>
                    </div>

                    {/* Sort Filter Tabs */}
                    <div className="flex gap-2 px-5 text-xs font-bold">
                        <button
                            onClick={() => setAwardSort('latest')}
                            className={`px-3 py-1.5 rounded-full transition-all border ${
                                awardSort === 'latest'
                                    ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white font-black'
                                    : 'bg-white border-gray-150 text-gray-400'
                            }`}
                        >
                            최신순
                        </button>
                        <button
                            onClick={() => setAwardSort('popular')}
                            className={`px-3 py-1.5 rounded-full transition-all border ${
                                awardSort === 'popular'
                                    ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white font-black'
                                    : 'bg-white border-gray-150 text-gray-400'
                            }`}
                        >
                            인기순
                        </button>
                    </div>

                    {/* Award Books scroll view */}
                    <div className="flex overflow-x-auto gap-4 py-1 px-5 scrollbar-hide">
                        {awardLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-white rounded-[24px] p-2.5 border border-gray-100 w-[128px] shrink-0 animate-pulse">
                                    <div className="w-full h-[145px] bg-gray-150 rounded-[16px] mb-2" />
                                    <div className="h-3 bg-gray-150 rounded w-4/5 mb-1" />
                                    <div className="h-2.5 bg-gray-150 rounded w-3/5" />
                                </div>
                            ))
                        ) : (
                            awardBooks.map((book, idx) => (
                                <div key={idx} className="bg-white rounded-[24px] p-2.5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] w-[128px] shrink-0">
                                    <div className="relative w-full h-[145px] rounded-[16px] overflow-hidden mb-2.5 border border-gray-50">
                                        <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="128px" />
                                    </div>
                                    <h4 className="font-extrabold text-[11px] text-gray-900 tracking-tight line-clamp-1 mb-0.5">{book.title}</h4>
                                    <p className="text-[8.5px] text-gray-400 font-bold tracking-tight mb-1 truncate">{book.author} / {book.publisher}</p>
                                    <div className="flex items-center gap-0.5 text-[#16A34A]">
                                        <Star size={9} fill="currentColor" />
                                        <span className="text-[10px] font-black">{book.rating}</span>
                                        <span className="text-[10px] font-bold text-gray-400">({book.reviewsCount})</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <MainPopup />
        </div>
    );
}
