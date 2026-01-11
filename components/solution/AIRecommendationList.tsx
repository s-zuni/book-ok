"use client";

import { useEffect, useState } from "react";
import { Book } from "../../types";
import BookGrid from "../BookGrid";
import { Sparkles, RefreshCcw } from "lucide-react";

interface AIRecommendationListProps {
    keywords: string[];
}

export default function AIRecommendationList({ keywords }: AIRecommendationListProps) {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBooks = async () => {
            setLoading(true);
            try {
                // Combine keywords for a broader search or take the first few
                const query = keywords.slice(0, 2).join(' '); // Use top 2 keywords
                // 1108 is Children Category
                const res = await fetch(`/api/recommendations?query=${encodeURIComponent(query)}&categoryId=1108&sort=SalesPoint`);

                if (!res.ok) throw new Error("Failed");

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
                    setBooks(mappedBooks);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (keywords.length > 0) {
            fetchBooks();
        }
    }, [keywords]);

    if (!loading && books.length === 0) return null;

    return (
        <div className="mt-12 bg-green-50 rounded-[2.5rem] border border-green-100 p-8 lg:p-10 animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-white p-2.5 rounded-xl shadow-sm text-green-600">
                    <Sparkles size={24} fill="currentColor" />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-900">AI 맞춤 추천 도서</h3>
                    <p className="text-sm font-bold text-green-600/80">분석된 성향을 바탕으로 엄선했습니다</p>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="space-y-3">
                            <div className="aspect-[1/1.4] bg-white/50 rounded-2xl animate-pulse" />
                            <div className="h-4 bg-white/50 rounded w-3/4 animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <BookGrid books={books.slice(0, 8)} onSelectBook={(book) => window.open(`https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=${book.id}`, '_blank')} size="small" />
                    <p className="text-center text-xs text-green-600 font-bold mt-6 opacity-60">* 도서 클릭 시 구매 페이지로 이동합니다</p>
                </>
            )}
        </div>
    );
}
