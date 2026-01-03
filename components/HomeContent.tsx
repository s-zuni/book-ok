"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Book, Child } from "../types";
import Header from "./Header";
import BookGrid from "./BookGrid";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function HomeContent() {
    const [activeMenu, setActiveMenu] = useState<any>('rec');
    const [activeSubMenu, setActiveSubMenu] = useState('2025 사서 추천');
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (page?: number) => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const [librarianBooks, setLibrarianBooks] = useState<Book[]>([]);
    const [expertBooks, setExpertBooks] = useState<Book[]>([]);
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [librarianBooksError, setLibrarianBooksError] = useState<string | null>(null);

    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        fetchLibrarianBooks();
        fetchExpertBooks();
    }, []);

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

    const fetchLibrarianBooks = async () => {
        try {
            // Reverted to Supabase as requested. 
            // Assuming 'recommendation_type' column exists or we filter by some criteria.
            // If 'librarian' type doesn't exist in DB, this might return empty, but it's the requested "manage via Supabase" method.
            // We can also just fetch all books or random ones if specific type isn't set yet.
            const { data, error } = await supabase
                .from('books')
                .select('*')
                .eq('recommendation_type', 'librarian') // Assuming this tag exists or user will add it
                .order('id', { ascending: false });

            if (error) {
                console.error("Supabase error:", error);
                setLibrarianBooksError(error.message);
                return;
            }

            if (data && data.length > 0) {
                setLibrarianBooks(data);
                setLibrarianBooksError(null);
            } else {
                // Fallback if no specific librarian books found, maybe show all recent?
                const { data: allBooks } = await supabase.from('books').select('*').limit(10);
                if (allBooks) setLibrarianBooks(allBooks);
            }
        } catch (error) {
            console.error("Failed to fetch librarian books:", error);
            setLibrarianBooksError("도서 정보를 불러오는데 실패했습니다.");
        }
    };

    const fetchExpertBooks = async () => {
        const { data } = await supabase.from('books').select('*').eq('recommendation_type', 'expert').order('id', { ascending: false });
        if (data) setExpertBooks(data);
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

            <div className="max-w-7xl mx-auto px-6 py-8 lg:py-12 flex flex-col lg:flex-row gap-6 lg:gap-12">
                <div className="hidden lg:flex">
                    <Sidebar
                        activeChild={activeChild}
                        activeMenu="rec"
                        activeSubMenu={activeSubMenu}
                        setActiveSubMenu={setActiveSubMenu}
                    />
                </div>

                <main className="flex-1 min-h-[600px]">
                    {activeSubMenu === '2025 사서 추천' && (
                        <>
                            {librarianBooksError && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
                                    <p className="text-yellow-800 font-bold text-sm">⚠️ 사서 추천 도서를 불러올 수 없습니다</p>
                                    <p className="text-yellow-600 text-xs mt-2">{librarianBooksError}</p>
                                </div>
                            )}
                            <BookGrid books={librarianBooks} onSelectBook={handleSelectBook} size="small" />
                        </>
                    )}
                    {activeSubMenu === '전문가 추천' && <BookGrid books={expertBooks} onSelectBook={handleSelectBook} />}
                    {activeSubMenu !== '2025 사서 추천' && activeSubMenu !== '전문가 추천' && (
                        <div className="text-center py-20 text-gray-400 font-bold">이 섹션은 준비 중입니다.</div>
                    )}
                </main>
            </div>
        </div>
    );
}
