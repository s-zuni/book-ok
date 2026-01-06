"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Book, Child } from "../types";
import Header from "./Header";
import BookGrid from "./BookGrid";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import HeroSection from "./HeroSection";
import RecommendationSection from "./RecommendationSection";

export default function HomeContent() {
    const [activeMenu, setActiveMenu] = useState<any>('rec');
    const [activeSubMenu, setActiveSubMenu] = useState('2025 사서 추천');
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (page?: number) => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeChild, setActiveChild] = useState<Child | null>(null);

    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            supabase.from('children').select('*').eq('profile_id', user.id).then(({ data }) => {
                if (data && data.length > 0) {
                    const child = data[0];
                    const age = new Date().getFullYear() - new Date(child.birthdate).getFullYear();
                    setActiveChild({ ...child, age });
                }
            });
        }
    }, [user]);

    useEffect(() => {
        fetchBooks();
    }, [activeSubMenu, activeChild]);

    const fetchBooks = async () => {
        // Only fetch for specific submenus
        const validMenus = ["2025 사서 추천", "전문가 추천", "수상 도서작"];
        if (!validMenus.includes(activeSubMenu)) {
            setRecommendedBooks([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let query = "";
            let categoryId = "1108"; // Default: Children

            // Dynamic Query Mapping
            if (activeSubMenu === "2025 사서 추천") {
                query = "사서추천";
            } else if (activeSubMenu === "전문가 추천") {
                query = "전문가추천";
            } else if (activeSubMenu === "수상 도서작") {
                query = "수상작";
            }

            // Category Filtering based on Active Child Age
            // 4123: Children/Infant (Infant usually), 1108: Children
            if (activeChild && activeChild.age <= 7) {
                categoryId = "4123";
            } else {
                categoryId = "1108";
            }

            const res = await fetch(`/api/recommendations?query=${encodeURIComponent(query)}&categoryId=${categoryId}`);

            if (!res.ok) {
                throw new Error("Failed to fetch recommendations");
            }

            const data = await res.json();

            if (data.item) {
                const mappedBooks: Book[] = data.item.map((item: any) => ({
                    id: item.isbn13 || item.isbn,
                    bookid: item.isbn13 || item.isbn,
                    title: item.title,
                    author: item.author,
                    imgsrc: item.cover,
                    category: item.categoryName,
                    pubDate: item.pubDate,
                    description: item.description
                }));
                // Ensure duplicate keys don't crash React if Aladin returns duplicates (rare but possible)
                // Filter distinct by id? No, BookGrid handles keys by id.
                setRecommendedBooks(mappedBooks);
            } else {
                setRecommendedBooks([]);
            }

        } catch (err: any) {
            console.error("Fetch books error:", err);
            setError("도서 정보를 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectBook = (book: Book) => {
        const id = typeof book.id === 'number' ? book.id : encodeURIComponent(book.id);
        router.push(`/book/${id}`);
    };

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

            <main className="pb-20">
                <div className="max-w-[1920px] mx-auto">
                    <HeroSection />

                    <div id="recommendations" className="space-y-0">
                        <RecommendationSection
                            title="2025 사서 추천 도서"
                            subtitle="전국 도서관 사서들이 엄선한 올해의 필독서"
                            query="사서추천"
                            categoryId={activeChild && activeChild.age <= 7 ? "4123" : "1108"}
                        />

                        <RecommendationSection
                            title="전문가 추천 도서"
                            subtitle="독서 교육 전문가들이 추천하는 단계별 도서"
                            query="전문가추천"
                            categoryId={activeChild && activeChild.age <= 7 ? "4123" : "1108"}
                            backgroundColor="bg-gray-50"
                        />

                        <RecommendationSection
                            title="수상 도서작"
                            subtitle="문학상 수상으로 작품성을 인정받은 수작"
                            query="수상작"
                            categoryId={activeChild && activeChild.age <= 7 ? "4123" : "1108"}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
