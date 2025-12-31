"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Book, Child } from "../types";
import Header from "../components/Header";
import BookGrid from "../components/BookGrid";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [activeMenu, setActiveMenu] = useState<any>('rec');
  const [activeSubMenu, setActiveSubMenu] = useState('2025 사서 추천');

  const [librarianBooks, setLibrarianBooks] = useState<Book[]>([]);
  const [expertBooks, setExpertBooks] = useState<Book[]>([]);
  const [activeChild, setActiveChild] = useState<Child | null>(null);

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
      }
    } catch (error) {
      console.error("Failed to fetch librarian books:", error);
    }
  };

  const fetchExpertBooks = async () => {
    const { data } = await supabase.from('books').select('*').eq('recommendation_type', 'expert').order('id', { ascending: false });
    if (data) setExpertBooks(data);
  };

  const handleSelectBook = (book: Book) => {
    // Navigate to book detail
    // Since librarian books use URL as ID, we might need a better strategy if we want deep linking.
    // If we use the URL directly, Next.js routes might break if not encoded.
    // For now, assume it works or we need encoding.
    // But verify if book.id is a number (Supabase) or string (URL).

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
        searchQuery=""
        setSearchQuery={() => { }}
        handleSearch={() => { }}
      />

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
        <Sidebar
          activeChild={activeChild}
          activeMenu="rec"
          activeSubMenu={activeSubMenu}
          setActiveSubMenu={setActiveSubMenu}
        />

        <main className="flex-1 min-h-[600px]">
          {activeSubMenu === '2025 사서 추천' && <BookGrid books={librarianBooks} onSelectBook={handleSelectBook} />}
          {activeSubMenu === '전문가 추천' && <BookGrid books={expertBooks} onSelectBook={handleSelectBook} />}
          {activeSubMenu !== '2025 사서 추천' && activeSubMenu !== '전문가 추천' && (
            <div className="text-center py-20 text-gray-400 font-bold">이 섹션은 준비 중입니다.</div>
          )}
        </main>
      </div>
    </div>
  );
}