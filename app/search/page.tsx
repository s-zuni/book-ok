"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Book } from "../../types";
import BookGrid from "../../components/BookGrid";
import BookList from "../../components/BookList";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { Child } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <SearchContent />
        </Suspense>
    );
}

function SearchContent() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";

    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [searchResults, setSearchResults] = useState<Book[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    // States needed for Header/Sidebar to work visually (simulated for now)
    const [activeMenu, setActiveMenu] = useState<any>('rec');
    const [activeSubMenu, setActiveSubMenu] = useState('');

    // Auth context
    const { user } = useAuth();

    useEffect(() => {
        if (initialQuery) {
            handleSearch(1, initialQuery);
        }
        // Fetch active child
        if (user) {
            supabase.from('children').select('*').eq('profile_id', user.id).then(({ data }) => {
                if (data && data.length > 0) {
                    const child = data[0];
                    const age = new Date().getFullYear() - new Date(child.birthdate).getFullYear();
                    setActiveChild({ ...child, age });
                }
            });
        }
    }, [initialQuery, user]);

    const handleSearch = async (page: number, query: string = searchQuery) => {
        if (!query.trim()) return;
        setLoading(true);
        setCurrentPage(page);
        try {
            const res = await fetch(`/api/search?query=${encodeURIComponent(query)}&page=${page}`);
            const data = await res.json();
            if (data.item) {
                setTotalResults(data.totalResults || 0);
                setSearchResults(data.item.map((it: any) => ({
                    id: it.isbn13 || it.isbn,
                    bookid: it.isbn13 || it.isbn,
                    title: it.title,
                    author: it.author,
                    imgsrc: it.cover,
                    category: it.categoryName,
                    pubDate: it.pubDate,
                    description: it.description
                })));
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setSearchResults([]);
                setTotalResults(0);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const dummySetView = () => { }; // No-op as we are in app router

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

            <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
                <div className="hidden lg:flex">
                    <Sidebar
                        activeChild={activeChild}
                        activeMenu={activeMenu}
                        activeSubMenu={activeSubMenu}
                        setActiveSubMenu={setActiveSubMenu}
                    />
                </div>

                <main className="flex-1 min-h-[600px]">
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">'{searchQuery}' 검색 결과</h2>
                            <p className="text-gray-500 text-sm">전체 {totalResults}권 중 {(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, totalResults)}권 표시</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            <BookList books={searchResults} onSelectBook={(book) => window.location.href = `/book/${book.id}`} />

                            {totalResults > 10 && (
                                <div className="mt-12 flex items-center justify-center gap-4">
                                    <button
                                        onClick={() => handleSearch(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="p-3 rounded-full border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <span className="font-bold text-gray-900 px-4">
                                        {currentPage} / {Math.ceil(totalResults / 10)}
                                    </span>
                                    <button
                                        onClick={() => handleSearch(currentPage + 1)}
                                        disabled={currentPage * 10 >= totalResults}
                                        className="p-3 rounded-full border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
