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
            const res = await fetch('/api/librarian-books');
            const data = await res.json();

            // Check if there's an error in the response
            if (data.error) {
                console.warn('Librarian books API error:', data.error, data.details);
                setLibrarianBooksError(data.details || data.error);
                setLibrarianBooks([]);
                return;
            }

            if (data.response?.body?.items?.item) {
                const items = data.response.body.items.item;
                const books = items.map((apiBook: any) => ({
                    id: apiBook.url,
                    bookid: apiBook.url,
                    title: apiBook.title,
                    author: apiBook.creator,
                    imgsrc: apiBook.referenceIdentifier || '/file.svg',
                    category: apiBook.subjectCategory || '미분류',
                    pubDate: apiBook.regDate,
                    description: Array.isArray(apiBook.description) ? apiBook.description.join('\n') : apiBook.description,
                }));
                setLibrarianBooks(books);
                setLibrarianBooksError(null);
            } else {
                setLibrarianBooks([]);
            }
        } catch (error) {
            console.error("Failed to fetch librarian books:", error);
            setLibrarianBooksError("네트워크 오류가 발생했습니다.");
            setLibrarianBooks([]);
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
            />

            <div className="max-w-7xl mx-auto px-6 py-8 lg:py-12 flex flex-col lg:flex-row gap-6 lg:gap-12">
                <Sidebar
                    activeChild={activeChild}
                    activeMenu="rec"
                    activeSubMenu={activeSubMenu}
                    setActiveSubMenu={setActiveSubMenu}
                />

                <main className="flex-1 min-h-[600px]">
                    {activeSubMenu === '2025 사서 추천' && (
                        <>
                            {librarianBooksError && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
                                    <p className="text-yellow-800 font-bold text-sm">⚠️ 사서 추천 도서를 불러올 수 없습니다</p>
                                    <p className="text-yellow-600 text-xs mt-2">{librarianBooksError}</p>
                                </div>
                            )}
                            <BookGrid books={librarianBooks} onSelectBook={handleSelectBook} />
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
